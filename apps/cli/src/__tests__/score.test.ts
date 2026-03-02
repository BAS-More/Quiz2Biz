/**
 * Unit tests for Score command
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import { scoreCommand } from '../commands/score';
import { ApiClient } from '../lib/api-client';
import { Config } from '../lib/config';

// eslint-disable-next-line no-var
var mockSpinner: Record<string, jest.Mock>;
// eslint-disable-next-line no-var
var mockHexFn: jest.Mock;

jest.mock('ora', () => {
  mockSpinner = {
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
  };
  mockSpinner.start.mockReturnValue(mockSpinner);
  mockSpinner.succeed.mockReturnValue(mockSpinner);
  mockSpinner.fail.mockReturnValue(mockSpinner);
  return { __esModule: true, default: jest.fn(() => mockSpinner) };
});

jest.mock('table', () => ({
  __esModule: true,
  table: jest.fn((data: unknown) => `TABLE:${JSON.stringify(data)}`),
}));

jest.mock('chalk', () => {
  mockHexFn = jest.fn((str: string) => `HEX:${str}`);
  return {
    __esModule: true,
    default: {
      red: jest.fn((str: string) => `RED:${str}`),
      gray: jest.fn((str: string) => `GRAY:${str}`),
      bold: jest.fn((str: string) => `BOLD:${str}`),
      green: jest.fn((str: string) => `GREEN:${str}`),
      yellow: jest.fn((str: string) => `YELLOW:${str}`),
      hex: jest.fn(() => mockHexFn),
    },
  };
});

jest.mock('../lib/api-client');
jest.mock('../lib/config');

describe('scoreCommand', () => {
  let mockConfig: any;
  let mockApiClient: any;

  beforeEach(() => {
    // Re-setup ora mock after resetMocks
    (ora as unknown as jest.Mock).mockReturnValue(mockSpinner);
    mockSpinner.start.mockReturnValue(mockSpinner);
    mockSpinner.succeed.mockReturnValue(mockSpinner);
    mockSpinner.fail.mockReturnValue(mockSpinner);

    // Re-setup chalk mocks after resetMocks
    (chalk.red as unknown as jest.Mock).mockImplementation((s: string) => `RED:${s}`);
    (chalk.gray as unknown as jest.Mock).mockImplementation((s: string) => `GRAY:${s}`);
    (chalk.bold as unknown as jest.Mock).mockImplementation((s: string) => `BOLD:${s}`);
    (chalk.green as unknown as jest.Mock).mockImplementation((s: string) => `GREEN:${s}`);
    (chalk.yellow as unknown as jest.Mock).mockImplementation((s: string) => `YELLOW:${s}`);
    ((chalk as any).hex as jest.Mock).mockReturnValue(mockHexFn);
    mockHexFn.mockImplementation((s: string) => `HEX:${s}`);

    // Re-setup table mock after resetMocks
    (table as unknown as jest.Mock).mockImplementation(
      (data: unknown) => `TABLE:${JSON.stringify(data)}`,
    );

    // Reset commander option state to prevent test pollution
    scoreCommand.setOptionValue('detailed', undefined);
    scoreCommand.setOptionValue('json', undefined);
    scoreCommand.setOptionValue('offline', undefined);

    // Setup Config mock
    mockConfig = {
      get: jest.fn(),
      getOfflineData: jest.fn(),
      reset: jest.fn(),
    };
    (Config as any).mockImplementation(() => mockConfig);

    // Setup ApiClient mock
    mockApiClient = {
      getScore: jest.fn(),
    };
    (ApiClient as any).mockImplementation(() => mockApiClient);

    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Mock process.exit
    jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  it('should be a Command instance', () => {
    expect(scoreCommand).toBeInstanceOf(Command);
  });

  it('should have correct name', () => {
    expect(scoreCommand.name()).toBe('score');
  });

  it('should have correct description', () => {
    expect(scoreCommand.description()).toBe('Get readiness score for a session');
  });

  it('should have session ID argument', () => {
    const args = scoreCommand.registeredArguments;
    expect(args[0].name()).toBe('sessionId');
  });

  it('should have detailed option', () => {
    const opts = scoreCommand.options;
    expect(opts.find((o: any) => o.flags === '-d, --detailed')).toBeDefined();
  });

  it('should have json option', () => {
    const opts = scoreCommand.options;
    expect(opts.find((o: any) => o.flags === '-j, --json')).toBeDefined();
  });

  it('should have offline option', () => {
    const opts = scoreCommand.options;
    expect(opts.find((o: any) => o.flags === '--offline')).toBeDefined();
  });

  it('should exit with error when no session ID and no default', async () => {
    mockConfig.get.mockReturnValue(null);

    await scoreCommand.parseAsync(['node', 'test']);

    expect(console.error).toHaveBeenCalledWith(
      'RED:Error: No session ID provided and no default session configured.',
    );
    expect(console.log).toHaveBeenCalledWith(
      'GRAY:Use: quiz2biz config set defaultSession <sessionId>',
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should use provided session ID', async () => {
    mockConfig.get.mockReturnValue(null);
    mockApiClient.getScore.mockResolvedValue({ overallScore: 0.85 });

    await scoreCommand.parseAsync(['node', 'test', 'session-123']);

    expect(mockApiClient.getScore).toHaveBeenCalledWith('session-123');
  });

  it('should use default session when none provided', async () => {
    mockConfig.get.mockReturnValue('default-session-456');
    mockApiClient.getScore.mockResolvedValue({ overallScore: 0.85 });

    await scoreCommand.parseAsync(['node', 'test']);

    expect(mockApiClient.getScore).toHaveBeenCalledWith('default-session-456');
  });

  it('should show spinner during API call', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getScore.mockResolvedValue({ overallScore: 0.85 });

    await scoreCommand.parseAsync(['node', 'test']);

    expect(ora).toHaveBeenCalledWith('Fetching readiness score...');
    expect(mockSpinner.start).toHaveBeenCalled();
    expect(mockSpinner.succeed).toHaveBeenCalledWith('Score retrieved');
  });

  it('should output JSON when --json flag is used', async () => {
    mockConfig.get.mockReturnValue('session-123');
    const mockScoreData = { overallScore: 0.85 };
    mockApiClient.getScore.mockResolvedValue(mockScoreData);

    await scoreCommand.parseAsync(['node', 'test', '--json']);

    expect(console.log).toHaveBeenCalledWith(JSON.stringify(mockScoreData, null, 2));
  });

  it('should display overall score heading', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getScore.mockResolvedValue({ overallScore: 0.85 });

    await scoreCommand.parseAsync(['node', 'test']);

    expect(console.log).toHaveBeenCalledWith('\nBOLD:📊 Quiz2Biz Readiness Score');
  });

  it('should display score with green color for score >= 0.95', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getScore.mockResolvedValue({ overallScore: 0.95 });

    await scoreCommand.parseAsync(['node', 'test']);

    expect(console.log).toHaveBeenCalledWith(
      '\nBOLD:Overall Score: GREEN:95.0%',
    );
  });

  it('should display score with yellow color for score >= 0.7', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getScore.mockResolvedValue({ overallScore: 0.75 });

    await scoreCommand.parseAsync(['node', 'test']);

    expect(console.log).toHaveBeenCalledWith(
      '\nBOLD:Overall Score: YELLOW:75.0%',
    );
  });

  it('should display score with red color for score < 0.4', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getScore.mockResolvedValue({ overallScore: 0.35 });

    await scoreCommand.parseAsync(['node', 'test']);

    expect(console.log).toHaveBeenCalledWith(
      '\nBOLD:Overall Score: RED:35.0%',
    );
  });

  it('should display detailed breakdown when --detailed flag is used', async () => {
    mockConfig.get.mockReturnValue('session-123');
    const mockScoreData = {
      overallScore: 0.85,
      dimensions: [
        { name: 'Security', score: 0.90, questionsAnswered: 9, totalQuestions: 10 },
        { name: 'Architecture', score: 0.80, questionsAnswered: 8, totalQuestions: 10 },
      ],
    };
    mockApiClient.getScore.mockResolvedValue(mockScoreData);

    await scoreCommand.parseAsync(['node', 'test', '--detailed']);

    expect(table).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('\nBOLD:Dimension Breakdown:');
  });

  it('should use offline data when --offline flag is used', async () => {
    mockConfig.get.mockReturnValue('session-123');
    const mockOfflineData = {
      score: { overallScore: 0.78 },
    };
    mockConfig.getOfflineData.mockReturnValue(mockOfflineData);

    await scoreCommand.parseAsync(['node', 'test', '--offline']);

    expect(mockConfig.getOfflineData).toHaveBeenCalledWith('session-123');
    expect(console.log).toHaveBeenCalledWith(
      '\nBOLD:Overall Score: YELLOW:78.0%',
    );
  });

  it('should exit with error when no offline data found', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockConfig.getOfflineData.mockReturnValue(null);

    await scoreCommand.parseAsync(['node', 'test', '--offline']);

    expect(mockSpinner.fail).toHaveBeenCalledWith('No offline data found for this session');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle API errors gracefully', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getScore.mockRejectedValue(new Error('API Error'));

    await scoreCommand.parseAsync(['node', 'test']);

    expect(mockSpinner.fail).toHaveBeenCalledWith('Failed to fetch score');
    expect(console.error).toHaveBeenCalledWith('RED:API Error');
  });

  it('should handle non-Error exceptions', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getScore.mockRejectedValue('string error');

    await scoreCommand.parseAsync(['node', 'test']);

    expect(mockSpinner.fail).toHaveBeenCalledWith('Failed to fetch score');
    expect(console.error).toHaveBeenCalledWith('RED:Unknown error');
  });

  it('should display progress summary', async () => {
    mockConfig.get.mockReturnValue('session-123');
    const mockScoreData = {
      overallScore: 0.85,
      progress: {
        sectionsLeft: 3,
        questionsLeft: 15,
        currentSectionProgress: 5,
        currentSectionTotal: 10,
      },
    };
    mockApiClient.getScore.mockResolvedValue(mockScoreData);

    await scoreCommand.parseAsync(['node', 'test']);

    expect(console.log).toHaveBeenCalledWith('\nBOLD:Progress:');
    expect(console.log).toHaveBeenCalledWith('  Sections left: 3');
    expect(console.log).toHaveBeenCalledWith('  Questions left: 15');
    expect(console.log).toHaveBeenCalledWith('  Current section: 5/10');
  });

  it('should display N/A for missing progress data', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getScore.mockResolvedValue({ overallScore: 0.85 });

    await scoreCommand.parseAsync(['node', 'test']);

    expect(console.log).toHaveBeenCalledWith('  Sections left: N/A');
    expect(console.log).toHaveBeenCalledWith('  Questions left: N/A');
    expect(console.log).toHaveBeenCalledWith('  Current section: 0/0');
  });
});
