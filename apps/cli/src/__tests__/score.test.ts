/**
 * Unit tests for Score command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import { scoreCommand } from '../commands/score';
import { ApiClient } from '../lib/api-client';
import { Config } from '../lib/config';

// Mock dependencies
const mockSpinner = {
  start: vi.fn().mockReturnThis(),
  succeed: vi.fn().mockReturnThis(),
  fail: vi.fn().mockReturnThis(),
};

const mockTable = vi.fn((data) => `TABLE:${JSON.stringify(data)}`);

vi.mock('ora', () => ({
  default: vi.fn(() => mockSpinner),
}));

vi.mock('table', () => ({
  table: mockTable,
}));

vi.mock('chalk', () => ({
  default: {
    red: vi.fn((str) => `RED:${str}`),
    gray: vi.fn((str) => `GRAY:${str}`),
    bold: vi.fn((str) => `BOLD:${str}`),
    green: vi.fn((str) => `GREEN:${str}`),
    yellow: vi.fn((str) => `YELLOW:${str}`),
    blue: vi.fn((str) => `BLUE:${str}`),
  },
}));

vi.mock('../lib/api-client');
vi.mock('../lib/config');

describe('scoreCommand', () => {
  let mockConfig: any;
  let mockApiClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup Config mock
    mockConfig = {
      get: vi.fn(),
      getOfflineData: vi.fn(),
      reset: vi.fn(),
    };
    (Config as any).mockImplementation(() => mockConfig);

    // Setup ApiClient mock
    mockApiClient = {
      getScore: vi.fn(),
    };
    (ApiClient as any).mockImplementation(() => mockApiClient);

    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});

    // Mock process.exit
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('should have detailed option', () => {
    const opts = scoreCommand.opts();
    expect(opts.find((o: any) => o.flags === '-d, --detailed')).toBeDefined();
  });

  it('should have json option', () => {
    const opts = scoreCommand.opts();
    expect(opts.find((o: any) => o.flags === '-j, --json')).toBeDefined();
  });

  it('should have offline option', () => {
    const opts = scoreCommand.opts();
    expect(opts.find((o: any) => o.flags === '--offline')).toBeDefined();
  });

  it('should exit with error when no session ID and no default', async () => {
    mockConfig.get.mockReturnValue(null);

    await scoreCommand.parseAsync(['node', 'test', 'score']);

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
    const mockScoreData = { overall: 85, dimensions: [] };
    mockApiClient.getScore.mockResolvedValue(mockScoreData);

    await scoreCommand.parseAsync(['node', 'test', 'score', 'session-123']);

    expect(mockApiClient.getScore).toHaveBeenCalledWith('session-123');
  });

  it('should use default session when none provided', async () => {
    mockConfig.get.mockReturnValue('default-session-456');
    const mockScoreData = { overall: 85, dimensions: [] };
    mockApiClient.getScore.mockResolvedValue(mockScoreData);

    await scoreCommand.parseAsync(['node', 'test', 'score']);

    expect(mockApiClient.getScore).toHaveBeenCalledWith('default-session-456');
  });

  it('should show spinner during API call', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getScore.mockResolvedValue({ overall: 85 });

    await scoreCommand.parseAsync(['node', 'test', 'score']);

    expect(ora).toHaveBeenCalledWith('Fetching readiness score...');
    expect(mockSpinner.start).toHaveBeenCalled();
    expect(mockSpinner.succeed).toHaveBeenCalledWith('Score retrieved');
  });

  it('should output JSON when --json flag is used', async () => {
    mockConfig.get.mockReturnValue('session-123');
    const mockScoreData = { overall: 85, dimensions: [] };
    mockApiClient.getScore.mockResolvedValue(mockScoreData);

    await scoreCommand.parseAsync(['node', 'test', 'score', '--json']);

    expect(console.log).toHaveBeenCalledWith(JSON.stringify(mockScoreData, null, 2));
  });

  it('should display overall score', async () => {
    mockConfig.get.mockReturnValue('session-123');
    const mockScoreData = { overall: 85, dimensions: [] };
    mockApiClient.getScore.mockResolvedValue(mockScoreData);

    await scoreCommand.parseAsync(['node', 'test', 'score']);

    expect(console.log).toHaveBeenCalledWith('\nBOLD:📊 Readiness Score: 85%');
  });

  it('should display score with color coding (high score)', async () => {
    mockConfig.get.mockReturnValue('session-123');
    const mockScoreData = { overall: 95, dimensions: [] };
    mockApiClient.getScore.mockResolvedValue(mockScoreData);

    await scoreCommand.parseAsync(['node', 'test', 'score']);

    expect(console.log).toHaveBeenCalledWith('\nBOLD:📊 Readiness Score: GREEN:95%');
  });

  it('should display score with color coding (medium score)', async () => {
    mockConfig.get.mockReturnValue('session-123');
    const mockScoreData = { overall: 75, dimensions: [] };
    mockApiClient.getScore.mockResolvedValue(mockScoreData);

    await scoreCommand.parseAsync(['node', 'test', 'score']);

    expect(console.log).toHaveBeenCalledWith('\nBOLD:📊 Readiness Score: YELLOW:75%');
  });

  it('should display score with color coding (low score)', async () => {
    mockConfig.get.mockReturnValue('session-123');
    const mockScoreData = { overall: 35, dimensions: [] };
    mockApiClient.getScore.mockResolvedValue(mockScoreData);

    await scoreCommand.parseAsync(['node', 'test', 'score']);

    expect(console.log).toHaveBeenCalledWith('\nBOLD:📊 Readiness Score: RED:35%');
  });

  it('should display detailed breakdown when --detailed flag is used', async () => {
    mockConfig.get.mockReturnValue('session-123');
    const mockScoreData = {
      overall: 85,
      dimensions: [
        { name: 'Security', score: 90 },
        { name: 'Architecture', score: 80 },
      ],
    };
    mockApiClient.getScore.mockResolvedValue(mockScoreData);

    await scoreCommand.parseAsync(['node', 'test', 'score', '--detailed']);

    expect(mockTable).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('BOLD:Dimension Breakdown:');
  });

  it('should use offline data when --offline flag is used', async () => {
    mockConfig.get.mockReturnValue('session-123');
    const mockOfflineData = {
      score: { overall: 78, dimensions: [] },
    };
    mockConfig.getOfflineData.mockReturnValue(mockOfflineData);

    await scoreCommand.parseAsync(['node', 'test', 'score', '--offline']);

    expect(mockConfig.getOfflineData).toHaveBeenCalledWith('session-123');
    expect(console.log).toHaveBeenCalledWith('\nBOLD:📊 Readiness Score: YELLOW:78%');
  });

  it('should exit with error when no offline data found', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockConfig.getOfflineData.mockReturnValue(null);

    await scoreCommand.parseAsync(['node', 'test', 'score', '--offline']);

    expect(mockSpinner.fail).toHaveBeenCalledWith('No offline data found for this session');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle API errors gracefully', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getScore.mockRejectedValue(new Error('API Error'));

    await scoreCommand.parseAsync(['node', 'test', 'score']);

    expect(mockSpinner.fail).toHaveBeenCalledWith('RED:Failed to fetch score: API Error');
  });

  it('should handle network errors', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getScore.mockRejectedValue({
      response: { data: { message: 'Network error' } },
    });

    await scoreCommand.parseAsync(['node', 'test', 'score']);

    expect(mockSpinner.fail).toHaveBeenCalledWith('RED:Failed to fetch score: Network error');
  });

  it('should handle unauthorized errors', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getScore.mockRejectedValue({
      response: { status: 401 },
    });

    await scoreCommand.parseAsync(['node', 'test', 'score']);

    expect(mockSpinner.fail).toHaveBeenCalledWith(
      'RED:Authentication failed. Please check your API configuration.',
    );
  });

  it('should handle forbidden errors', async () => {
    mockConfig.get.mockReturnValue('session-123');
    mockApiClient.getScore.mockRejectedValue({
      response: { status: 403 },
    });

    await scoreCommand.parseAsync(['node', 'test', 'score']);

    expect(mockSpinner.fail).toHaveBeenCalledWith(
      'RED:Access denied. You do not have permission to access this session.',
    );
  });

  it('should display completion status', async () => {
    mockConfig.get.mockReturnValue('session-123');
    const mockScoreData = {
      overall: 85,
      dimensions: [],
      completed: true,
      totalQuestions: 50,
      answeredQuestions: 45,
    };
    mockApiClient.getScore.mockResolvedValue(mockScoreData);

    await scoreCommand.parseAsync(['node', 'test', 'score']);

    expect(console.log).toHaveBeenCalledWith('BOLD:Status: GREEN:Completed (45/50 questions)');
  });

  it('should display in-progress status', async () => {
    mockConfig.get.mockReturnValue('session-123');
    const mockScoreData = {
      overall: 85,
      dimensions: [],
      completed: false,
      totalQuestions: 50,
      answeredQuestions: 30,
    };
    mockApiClient.getScore.mockResolvedValue(mockScoreData);

    await scoreCommand.parseAsync(['node', 'test', 'score']);

    expect(console.log).toHaveBeenCalledWith('BOLD:Status: BLUE:In Progress (30/50 questions)');
  });
});
