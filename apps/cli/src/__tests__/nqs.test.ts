/**
 * Unit tests for NQS (Next Question Suggest) command
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { nqsCommand } from '../commands/nqs';
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

jest.mock('chalk', () => {
  mockHexFn = jest.fn((str: string) => `HEX:${str}`);
  return {
    __esModule: true,
    default: {
      red: jest.fn((str: string) => `RED:${str}`),
      bold: jest.fn((str: string) => `BOLD:${str}`),
      gray: jest.fn((str: string) => `GRAY:${str}`),
      green: jest.fn((str: string) => `GREEN:${str}`),
      yellow: jest.fn((str: string) => `YELLOW:${str}`),
      italic: jest.fn((str: string) => `ITALIC:${str}`),
      hex: jest.fn(() => mockHexFn),
    },
  };
});

jest.mock('../lib/api-client');
jest.mock('../lib/config');

describe('nqsCommand', () => {
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
    (chalk.bold as unknown as jest.Mock).mockImplementation((s: string) => `BOLD:${s}`);
    (chalk.gray as unknown as jest.Mock).mockImplementation((s: string) => `GRAY:${s}`);
    (chalk.green as unknown as jest.Mock).mockImplementation((s: string) => `GREEN:${s}`);
    (chalk.yellow as unknown as jest.Mock).mockImplementation((s: string) => `YELLOW:${s}`);
    ((chalk as any).italic as jest.Mock).mockImplementation((s: string) => `ITALIC:${s}`);
    ((chalk as any).hex as jest.Mock).mockReturnValue(mockHexFn);
    mockHexFn.mockImplementation((s: string) => `HEX:${s}`);

    // Reset commander option state to prevent test pollution
    nqsCommand.setOptionValue('count', '5');
    nqsCommand.setOptionValue('dimension', undefined);
    nqsCommand.setOptionValue('persona', undefined);
    nqsCommand.setOptionValue('json', undefined);

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
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Mock process.exit
    jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
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
    const args = nqsCommand.registeredArguments;
    expect(args[0].name()).toBe('sessionId');
  });

  it('should have count option', () => {
    const opts = nqsCommand.options;
    expect(opts.find((o: any) => o.flags === '-n, --count <number>')).toBeDefined();
  });

  it('should have dimension option', () => {
    const opts = nqsCommand.options;
    expect(opts.find((o: any) => o.flags === '-d, --dimension <key>')).toBeDefined();
  });

  it('should have persona option', () => {
    const opts = nqsCommand.options;
    expect(opts.find((o: any) => o.flags === '-p, --persona <type>')).toBeDefined();
  });

  it('should have json option', () => {
    const opts = nqsCommand.options;
    expect(opts.find((o: any) => o.flags === '-j, --json')).toBeDefined();
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
      questions: [{ id: 'q1', text: 'Question 1', dimension: 'security', persona: 'CTO', severity: 0.8, priority: 'HIGH' }],
      totalRemaining: 10,
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
      questions: [{ id: 'q1', text: 'Question 1', dimension: 'security', persona: 'CTO', severity: 0.8, priority: 'HIGH' }],
      totalRemaining: 10,
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
      questions: [{ id: 'q1', text: 'Question 1', dimension: 'security', persona: 'CTO', severity: 0.8, priority: 'HIGH' }],
      totalRemaining: 10,
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
      questions: [{ id: 'q1', text: 'Question 1', dimension: 'security', persona: 'CTO', severity: 0.8, priority: 'HIGH' }],
      totalRemaining: 10,
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
      questions: [{ id: 'q1', text: 'Question 1', dimension: 'security', persona: 'CTO', severity: 0.8, priority: 'HIGH' }],
      totalRemaining: 10,
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
      questions: [{ id: 'q1', text: 'Question 1', dimension: 'security', persona: 'CTO', severity: 0.8, priority: 'HIGH' }],
      totalRemaining: 10,
    });

    await nqsCommand.parseAsync(['node', 'test']);

    expect(ora).toHaveBeenCalledWith('Fetching question suggestions...');
    expect(mockSpinner.start).toHaveBeenCalled();
    expect(mockSpinner.succeed).toHaveBeenCalledWith('Found 1 suggested questions');
  });

  it('should output JSON when --json flag is used', async () => {
    mockConfig.get.mockReturnValue('session-123');
    const mockResponse = {
      questions: [{ id: 'q1', text: 'Question 1', dimension: 'security', persona: 'CTO', severity: 0.8, priority: 'HIGH' }],
      totalRemaining: 10,
    };
    mockApiClient.getNextQuestions.mockResolvedValue(mockResponse);

    await nqsCommand.parseAsync(['node', 'test', '--json']);

    expect(console.log).toHaveBeenCalledWith(JSON.stringify(mockResponse, null, 2));
  });

  it('should display formatted output when not using --json', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getNextQuestions.mockResolvedValue({
      questions: [
        { id: 'q1', text: 'Question 1', dimension: 'security', persona: 'CTO', severity: 0.8, priority: 'HIGH' },
      ],
      totalRemaining: 10,
    });

    await nqsCommand.parseAsync(['node', 'test']);

    expect(console.log).toHaveBeenCalledWith('\nBOLD:📝 Next Question Suggestions');
    expect(console.log).toHaveBeenCalledWith('GRAY:' + '─'.repeat(60));
  });

  it('should display completion message for empty question list', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getNextQuestions.mockResolvedValue({
      questions: [],
      totalRemaining: 0,
    });

    await nqsCommand.parseAsync(['node', 'test']);

    expect(mockSpinner.succeed).toHaveBeenCalledWith('Found 0 suggested questions');
    expect(console.log).toHaveBeenCalledWith(
      'GREEN:\n✅ All questions answered! Assessment complete.',
    );
  });

  it('should handle API errors gracefully', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getNextQuestions.mockRejectedValue(new Error('API Error'));

    await nqsCommand.parseAsync(['node', 'test']);

    expect(mockSpinner.fail).toHaveBeenCalledWith('Failed to fetch suggestions');
    expect(console.error).toHaveBeenCalledWith('RED:API Error');
  });

  it('should handle non-Error exceptions', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getNextQuestions.mockRejectedValue('string error');

    await nqsCommand.parseAsync(['node', 'test']);

    expect(mockSpinner.fail).toHaveBeenCalledWith('Failed to fetch suggestions');
    expect(console.error).toHaveBeenCalledWith('RED:Unknown error');
  });
});
