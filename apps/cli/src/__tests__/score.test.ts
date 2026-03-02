/**
 * Unit tests for Score command
 */

import { Command } from 'commander';
import ora from 'ora';
import { scoreCommand } from '../commands/score';
import { ApiClient } from '../lib/api-client';
import { Config } from '../lib/config';

// Use var for hoisting compatibility with jest.mock() factories
// eslint-disable-next-line no-var
var mockSpinner: any;

jest.mock('ora', () => ({
  __esModule: true,
  default: jest.fn(() => mockSpinner),
}));

jest.mock('table', () => ({
  table: jest.fn((data: unknown) => `TABLE:${JSON.stringify(data)}`),
}));

jest.mock('chalk', () => ({
  __esModule: true,
  default: {
    red: jest.fn((str: string) => `RED:${str}`),
    gray: jest.fn((str: string) => `GRAY:${str}`),
    bold: jest.fn((str: string) => `BOLD:${str}`),
    green: jest.fn((str: string) => `GREEN:${str}`),
    yellow: jest.fn((str: string) => `YELLOW:${str}`),
    blue: jest.fn((str: string) => `BLUE:${str}`),
    hex: jest.fn(() => jest.fn((str: string) => `HEX:${str}`)),
  },
}));

jest.mock('../lib/api-client');
jest.mock('../lib/config');

describe('scoreCommand', () => {
  let mockConfig: any;
  let mockApiClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSpinner = {
      start: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis(),
    };
    // Re-setup ora mock after resetMocks clears implementations
    (ora as unknown as jest.Mock).mockReturnValue(mockSpinner);

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

    // Re-setup chalk mocks after resetMocks clears implementations
    const chalk = jest.requireMock<any>('chalk').default;
    chalk.red.mockImplementation((str: string) => `RED:${str}`);
    chalk.gray.mockImplementation((str: string) => `GRAY:${str}`);
    chalk.bold.mockImplementation((str: string) => `BOLD:${str}`);
    chalk.green.mockImplementation((str: string) => `GREEN:${str}`);
    chalk.yellow.mockImplementation((str: string) => `YELLOW:${str}`);
    chalk.blue.mockImplementation((str: string) => `BLUE:${str}`);
    chalk.hex.mockImplementation(() => jest.fn((str: string) => `HEX:${str}`));

    // Reset Commander parsed state from previous tests
    (scoreCommand as any)._optionValues = {};
    (scoreCommand as any)._optionValueSources = {};
    (scoreCommand as any).processedArgs = [];
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
    
    expect(console.error).toHaveBeenCalledWith('RED:Error: No session ID provided and no default session configured.');
    expect(console.log).toHaveBeenCalledWith('GRAY:Use: quiz2biz config set defaultSession <sessionId>');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should use provided session ID', async () => {
    mockConfig.get.mockReturnValue(null);
    const mockScoreData = { overallScore: 0.85 };
    mockApiClient.getScore.mockResolvedValue(mockScoreData);
    
    await scoreCommand.parseAsync(['node', 'test', 'session-123']);
    
    expect(mockApiClient.getScore).toHaveBeenCalledWith('session-123');
  });

  it('should use default session when none provided', async () => {
    mockConfig.get.mockReturnValue('default-session-456');
    const mockScoreData = { overallScore: 0.85 };
    mockApiClient.getScore.mockResolvedValue(mockScoreData);
    
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

  it('should display overall score', async () => {
    mockConfig.get.mockReturnValue('session-123');
    const mockScoreData = { overallScore: 0.85 };
    mockApiClient.getScore.mockResolvedValue(mockScoreData);
    
    await scoreCommand.parseAsync(['node', 'test']);
    
    expect(console.log).toHaveBeenCalledWith('\nBOLD:📊 Quiz2Biz Readiness Score');
  });

  it('should display score with color coding (high score)', async () => {
    mockConfig.get.mockReturnValue('session-123');
    const mockScoreData = { overallScore: 0.95 };
    mockApiClient.getScore.mockResolvedValue(mockScoreData);
    
    await scoreCommand.parseAsync(['node', 'test']);
    
    expect(console.log).toHaveBeenCalledWith('\nBOLD:Overall Score: GREEN:95.0%');
  });

  it('should display score with color coding (medium score)', async () => {
    mockConfig.get.mockReturnValue('session-123');
    const mockScoreData = { overallScore: 0.75 };
    mockApiClient.getScore.mockResolvedValue(mockScoreData);
    
    await scoreCommand.parseAsync(['node', 'test']);
    
    expect(console.log).toHaveBeenCalledWith('\nBOLD:Overall Score: YELLOW:75.0%');
  });

  it('should display score with color coding (low score)', async () => {
    mockConfig.get.mockReturnValue('session-123');
    const mockScoreData = { overallScore: 0.35 };
    mockApiClient.getScore.mockResolvedValue(mockScoreData);
    
    await scoreCommand.parseAsync(['node', 'test']);
    
    expect(console.log).toHaveBeenCalledWith('\nBOLD:Overall Score: RED:35.0%');
  });

  it('should display detailed breakdown when --detailed flag is used', async () => {
    mockConfig.get.mockReturnValue('session-123');
    const mockScoreData = {
      overallScore: 0.85,
      dimensions: [
        { name: 'Security', score: 0.9, questionsAnswered: 9, totalQuestions: 10 },
        { name: 'Architecture', score: 0.8, questionsAnswered: 8, totalQuestions: 10 },
      ],
    };
    mockApiClient.getScore.mockResolvedValue(mockScoreData);
    
    await scoreCommand.parseAsync(['node', 'test', '--detailed']);
    
    expect(jest.requireMock<any>('table').table).toHaveBeenCalled();
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
    expect(console.log).toHaveBeenCalledWith('\nBOLD:📊 Quiz2Biz Readiness Score');
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

  it('should handle network errors', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getScore.mockRejectedValue({
      response: { data: { message: 'Network error' } },
    });
    
    await scoreCommand.parseAsync(['node', 'test']);
    
    expect(mockSpinner.fail).toHaveBeenCalledWith('Failed to fetch score');
    expect(console.error).toHaveBeenCalledWith('RED:Unknown error');
  });

  it('should handle unauthorized errors', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getScore.mockRejectedValue({
      response: { status: 401 },
    });
    
    await scoreCommand.parseAsync(['node', 'test']);
    
    expect(mockSpinner.fail).toHaveBeenCalledWith('Failed to fetch score');
    expect(console.error).toHaveBeenCalledWith('RED:Unknown error');
  });

  it('should handle forbidden errors', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getScore.mockRejectedValue({
      response: { status: 403 },
    });
    
    await scoreCommand.parseAsync(['node', 'test']);
    
    expect(mockSpinner.fail).toHaveBeenCalledWith('Failed to fetch score');
    expect(console.error).toHaveBeenCalledWith('RED:Unknown error');
  });

  it('should display completion status', async () => {
    mockConfig.get.mockReturnValue('session-123');
    const mockScoreData = { 
      overallScore: 0.85, 
      progress: {
        sectionsLeft: 0,
        questionsLeft: 5,
        currentSectionProgress: 10,
        currentSectionTotal: 10,
      },
    };
    mockApiClient.getScore.mockResolvedValue(mockScoreData);
    
    await scoreCommand.parseAsync(['node', 'test']);
    
    expect(console.log).toHaveBeenCalledWith('\nBOLD:Progress:');
    expect(console.log).toHaveBeenCalledWith('  Sections left: 0');
    expect(console.log).toHaveBeenCalledWith('  Questions left: 5');
  });

  it('should display in-progress status', async () => {
    mockConfig.get.mockReturnValue('session-123');
    const mockScoreData = { 
      overallScore: 0.85, 
      progress: {
        sectionsLeft: 3,
        questionsLeft: 20,
        currentSectionProgress: 5,
        currentSectionTotal: 10,
      },
    };
    mockApiClient.getScore.mockResolvedValue(mockScoreData);
    
    await scoreCommand.parseAsync(['node', 'test']);
    
    expect(console.log).toHaveBeenCalledWith('\nBOLD:Progress:');
    expect(console.log).toHaveBeenCalledWith('  Sections left: 3');
    expect(console.log).toHaveBeenCalledWith('  Questions left: 20');
    expect(console.log).toHaveBeenCalledWith('  Current section: 5/10');
  });
});
