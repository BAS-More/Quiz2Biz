/**
 * Unit tests for NQS (Next Question Suggest) command
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { nqsCommand } from '../commands/nqs';
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

jest.mock('chalk', () => ({
  __esModule: true,
  default: {
    red: jest.fn((str: string) => `RED:${str}`),
    bold: jest.fn((str: string) => `BOLD:${str}`),
    gray: jest.fn((str: string) => `GRAY:${str}`),
    green: jest.fn((str: string) => `GREEN:${str}`),
    yellow: jest.fn((str: string) => `YELLOW:${str}`),
    hex: jest.fn(() => jest.fn((str: string) => `HEX:${str}`)),
    italic: jest.fn((str: string) => `ITALIC:${str}`),
  },
}));

jest.mock('../lib/api-client');
jest.mock('../lib/config');

describe('nqsCommand', () => {
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
    (chalk.bold as unknown as jest.Mock).mockImplementation((str: string) => `BOLD:${str}`);
    (chalk.gray as unknown as jest.Mock).mockImplementation((str: string) => `GRAY:${str}`);
    (chalk.green as unknown as jest.Mock).mockImplementation((str: string) => `GREEN:${str}`);
    (chalk.yellow as unknown as jest.Mock).mockImplementation((str: string) => `YELLOW:${str}`);
    (chalk.hex as unknown as jest.Mock).mockImplementation(() => jest.fn((str: string) => `HEX:${str}`));
    ((chalk as any).italic as jest.Mock)?.mockImplementation?.((str: string) => `ITALIC:${str}`);

    // Reset Commander internal state to avoid state pollution between tests
    // Preserve option defaults (count defaults to '5' in the command definition)
    (nqsCommand as any)._optionValues = { count: '5' };
    (nqsCommand as any)._optionValueSources = { count: 'default' };
    (nqsCommand as any).args = [];
    (nqsCommand as any).processedArgs = [];

    // Setup Config mock
    mockConfig = {
      get: jest.fn(),
      reset: jest.fn(),
    };
    (Config as any).mockImplementation(() => mockConfig);

    // Setup ApiClient mock
    mockApiClient = {
      getNextQuestions: jest.fn(),
    };
    (ApiClient as any).mockImplementation(() => mockApiClient);

    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation(() => { });
    jest.spyOn(console, 'log').mockImplementation(() => { });

    // Mock process.exit
    jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be a Command instance', () => {
    expect(nqsCommand).toBeInstanceOf(Command);
  });

  it('should have correct name', () => {
    expect(nqsCommand.name()).toBe('nqs');
  });

  it('should have correct description', () => {
    expect(nqsCommand.description()).toBe('Get next question suggestions');
  });

  it('should have session ID argument', () => {
    const args = (nqsCommand as any)['_args'];
    expect(args[0].name()).toBe('sessionId');
  });

  it('should exit with error when no session ID and no default', async () => {
    mockConfig.get.mockReturnValue(null);

    await nqsCommand.parseAsync(['node', 'test']);

    expect(console.error).toHaveBeenCalledWith(
      'RED:Error: No session ID provided and no default session configured.',
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should use provided session ID', async () => {
    mockConfig.get.mockReturnValue(null);
    mockApiClient.getNextQuestions.mockResolvedValue({
      questions: [{ id: 'q1', text: 'Question 1' }],
    });

    await nqsCommand.parseAsync(['node', 'test', 'session-123']);

    expect(mockApiClient.getNextQuestions).toHaveBeenCalledWith('session-123', {
      count: 5,
      dimension: undefined,
      persona: undefined,
    });
  });

  it('should use default session when none provided', async () => {
    mockConfig.get.mockReturnValue('default-session-456');
    mockApiClient.getNextQuestions.mockResolvedValue({
      questions: [{ id: 'q1', text: 'Question 1' }],
    });

    await nqsCommand.parseAsync(['node', 'test']);

    expect(mockApiClient.getNextQuestions).toHaveBeenCalledWith('default-session-456', {
      count: 5,
      dimension: undefined,
      persona: undefined,
    });
  });

  it('should parse count option correctly', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getNextQuestions.mockResolvedValue({
      questions: [{ id: 'q1', text: 'Question 1' }],
    });

    await nqsCommand.parseAsync(['node', 'test', '-n', '10']);

    expect(mockApiClient.getNextQuestions).toHaveBeenCalledWith('session-123', {
      count: 10,
      dimension: undefined,
      persona: undefined,
    });
  });

  it('should pass dimension option', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getNextQuestions.mockResolvedValue({
      questions: [{ id: 'q1', text: 'Question 1' }],
    });

    await nqsCommand.parseAsync(['node', 'test', '-d', 'security']);

    expect(mockApiClient.getNextQuestions).toHaveBeenCalledWith('session-123', {
      count: 5,
      dimension: 'security',
      persona: undefined,
    });
  });

  it('should pass persona option', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getNextQuestions.mockResolvedValue({
      questions: [{ id: 'q1', text: 'Question 1' }],
    });

    await nqsCommand.parseAsync(['node', 'test', '-p', 'CTO']);

    expect(mockApiClient.getNextQuestions).toHaveBeenCalledWith('session-123', {
      count: 5,
      dimension: undefined,
      persona: 'CTO',
    });
  });

  it('should show spinner during API call', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getNextQuestions.mockResolvedValue({
      questions: [{ id: 'q1', text: 'Question 1' }],
    });

    await nqsCommand.parseAsync(['node', 'test']);

    expect(ora).toHaveBeenCalledWith('Fetching question suggestions...');
    expect(mockSpinner.start).toHaveBeenCalled();
    expect(mockSpinner.succeed).toHaveBeenCalledWith('Found 1 suggested questions');
  });

  it('should output JSON when --json flag is used', async () => {
    mockConfig.get.mockReturnValue('session-123');
    const mockResponse = {
      questions: [{ id: 'q1', text: 'Question 1' }],
      strategy: 'adaptive',
    };
    mockApiClient.getNextQuestions.mockResolvedValue(mockResponse);

    await nqsCommand.parseAsync(['node', 'test', '--json']);

    expect(console.log).toHaveBeenCalledWith(JSON.stringify(mockResponse, null, 2));
  });

  it('should handle empty question list', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getNextQuestions.mockResolvedValue({
      questions: [],
    });

    await nqsCommand.parseAsync(['node', 'test']);

    expect(mockSpinner.succeed).toHaveBeenCalledWith('Found 0 suggested questions');
  });

  it('should handle API errors gracefully', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getNextQuestions.mockRejectedValue(new Error('API Error'));

    await nqsCommand.parseAsync(['node', 'test']);

    // Source: spinner.fail('Failed to fetch suggestions'), then console.error(chalk.red(message))
    expect(mockSpinner.fail).toHaveBeenCalledWith('Failed to fetch suggestions');
    expect(console.error).toHaveBeenCalledWith('RED:API Error');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle non-Error thrown values', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getNextQuestions.mockRejectedValue('string error');

    await nqsCommand.parseAsync(['node', 'test']);

    expect(mockSpinner.fail).toHaveBeenCalledWith('Failed to fetch suggestions');
    expect(console.error).toHaveBeenCalledWith('RED:Unknown error');
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
