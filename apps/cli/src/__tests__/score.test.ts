/**
 * Unit tests for Score command
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { scoreCommand } from '../commands/score';
import { ApiClient } from '../lib/api-client';
import { Config } from '../lib/config';

// Mock dependencies
const mockSpinner = {
  start: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  fail: jest.fn().mockReturnThis(),
};

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

    // Re-setup mock implementations (resetMocks: true in config clears them)
    mockSpinner.start.mockReturnThis();
    mockSpinner.succeed.mockReturnThis();
    mockSpinner.fail.mockReturnThis();
    (ora as unknown as jest.Mock).mockReturnValue(mockSpinner);

    // Re-setup chalk mock implementations
    (chalk.red as unknown as jest.Mock).mockImplementation((str: string) => `RED:${str}`);
    (chalk.gray as unknown as jest.Mock).mockImplementation((str: string) => `GRAY:${str}`);
    (chalk.bold as unknown as jest.Mock).mockImplementation((str: string) => `BOLD:${str}`);
    (chalk.green as unknown as jest.Mock).mockImplementation((str: string) => `GREEN:${str}`);
    (chalk.yellow as unknown as jest.Mock).mockImplementation((str: string) => `YELLOW:${str}`);
    (chalk.blue as unknown as jest.Mock).mockImplementation((str: string) => `BLUE:${str}`);
    (chalk.hex as unknown as jest.Mock).mockImplementation(() =>
      jest.fn((str: string) => `HEX:${str}`),
    );

    // Reset Commander internal state to avoid state pollution between tests
    (scoreCommand as any)._optionValues = {};
    (scoreCommand as any)._optionValueSources = {};
    (scoreCommand as any).args = [];
    (scoreCommand as any).processedArgs = [];

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
    const args = (scoreCommand as any)['_args'];
    expect(args[0].name()).toBe('sessionId');
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
    const mockScoreData = { overallScore: 0.85, dimensions: [] };
    mockApiClient.getScore.mockResolvedValue(mockScoreData);

    await scoreCommand.parseAsync(['node', 'test', 'session-123']);

    expect(mockApiClient.getScore).toHaveBeenCalledWith('session-123');
  });

  it('should use default session when none provided', async () => {
    mockConfig.get.mockReturnValue('default-session-456');
    const mockScoreData = { overallScore: 0.85, dimensions: [] };
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
    const mockScoreData = { overallScore: 0.85, dimensions: [] };
    mockApiClient.getScore.mockResolvedValue(mockScoreData);

    await scoreCommand.parseAsync(['node', 'test', '--json']);

    expect(console.log).toHaveBeenCalledWith(JSON.stringify(mockScoreData, null, 2));
  });

  it('should use offline data when --offline flag is used', async () => {
    mockConfig.get.mockReturnValue('session-123');
    const mockOfflineData = {
      score: { overallScore: 0.78 },
    };
    mockConfig.getOfflineData.mockReturnValue(mockOfflineData);

    await scoreCommand.parseAsync(['node', 'test', '--offline']);

    expect(mockConfig.getOfflineData).toHaveBeenCalledWith('session-123');
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

    // Source: spinner.fail('Failed to fetch score'), then console.error(chalk.red(message))
    expect(mockSpinner.fail).toHaveBeenCalledWith('Failed to fetch score');
    expect(console.error).toHaveBeenCalledWith('RED:API Error');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle non-Error thrown values', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getScore.mockRejectedValue('string error');

    await scoreCommand.parseAsync(['node', 'test']);

    expect(mockSpinner.fail).toHaveBeenCalledWith('Failed to fetch score');
    expect(console.error).toHaveBeenCalledWith('RED:Unknown error');
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
