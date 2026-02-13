import { ApiClient } from '../api-client';
import { Config } from '../config';
import axios from 'axios';

jest.mock('axios');
jest.mock('../config');

describe('ApiClient', () => {
  let mockConfig: jest.Mocked<Config>;
  let apiClient: ApiClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };

    (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

    mockConfig = {
      get: jest.fn((key: string) => {
        if (key === 'apiUrl') {
          return 'http://localhost:3000/api';
        }
        if (key === 'apiToken') {
          return 'test-token-123';
        }
        return '';
      }),
    } as any;

    apiClient = new ApiClient(mockConfig);
  });

  describe('constructor', () => {
    it('creates axios instance with correct base URL', () => {
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3000/api',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token-123',
        },
        timeout: 30000,
      });
    });

    it('creates axios instance without auth header when no token', () => {
      mockConfig.get.mockReturnValue('');
      new ApiClient(mockConfig);

      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3000/api',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
    });

    it('uses default URL when apiUrl not configured', () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'apiUrl') {
          return '';
        }
        return '';
      });

      new ApiClient(mockConfig);

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://localhost:3000/api',
        }),
      );
    });
  });

  describe('getScore', () => {
    it('fetches score for given session ID', async () => {
      const mockScore = {
        overallScore: 85.5,
        dimensions: [{ name: 'Security', score: 90, questionsAnswered: 10, totalQuestions: 15 }],
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockScore });

      const result = await apiClient.getScore('session-123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/scoring/session-123');
      expect(result).toEqual(mockScore);
    });

    it('throws error when API call fails', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      await expect(apiClient.getScore('session-123')).rejects.toThrow('Network error');
    });
  });

  describe('getHeatmap', () => {
    it('fetches heatmap for given session ID', async () => {
      const mockHeatmap = {
        sessionName: 'Test Session',
        overallScore: 75.0,
        dimensions: [
          {
            name: 'Requirements',
            key: 'requirements',
            score: 80,
            questionsAnswered: 5,
            totalQuestions: 10,
            questions: [{ id: 'q1', text: 'Question 1', severity: 0.7, coverage: 0.5 }],
          },
        ],
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockHeatmap });

      const result = await apiClient.getHeatmap('session-456');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/heatmap/session-456');
      expect(result).toEqual(mockHeatmap);
    });
  });

  describe('getNextQuestions', () => {
    it('fetches next questions with default options', async () => {
      const mockResponse = {
        questions: [
          {
            id: 'q1',
            text: 'Test question',
            dimension: 'security',
            persona: 'CTO',
            severity: 0.8,
            priority: 'HIGH',
          },
        ],
        totalRemaining: 25,
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.getNextQuestions('session-789', {});

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/adaptive-logic/next/session-789?');
      expect(result).toEqual(mockResponse);
    });

    it('fetches next questions with count filter', async () => {
      const mockResponse = { questions: [], totalRemaining: 0 };
      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      await apiClient.getNextQuestions('session-789', { count: 5 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/adaptive-logic/next/session-789?count=5',
      );
    });

    it('fetches next questions with dimension filter', async () => {
      const mockResponse = { questions: [], totalRemaining: 0 };
      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      await apiClient.getNextQuestions('session-789', { dimension: 'security' });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/adaptive-logic/next/session-789?dimension=security',
      );
    });

    it('fetches next questions with persona filter', async () => {
      const mockResponse = { questions: [], totalRemaining: 0 };
      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      await apiClient.getNextQuestions('session-789', { persona: 'CTO' });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/adaptive-logic/next/session-789?persona=CTO',
      );
    });

    it('fetches next questions with all filters', async () => {
      const mockResponse = { questions: [], totalRemaining: 0 };
      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      await apiClient.getNextQuestions('session-789', {
        count: 3,
        dimension: 'architecture',
        persona: 'BA',
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/adaptive-logic/next/session-789?count=3&dimension=architecture&persona=BA',
      );
    });
  });

  describe('submitAnswer', () => {
    it('submits answer for a question', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });

      await apiClient.submitAnswer('session-111', 'question-222', 'Yes');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/questionnaire/answer', {
        sessionId: 'session-111',
        questionId: 'question-222',
        value: 'Yes',
      });
    });

    it('submits complex answer object', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });

      const complexAnswer = {
        value: ['Option1', 'Option2'],
        evidence: [{ id: 'e1', url: 'http://example.com/file.pdf' }],
      };

      await apiClient.submitAnswer('session-111', 'question-222', complexAnswer);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/questionnaire/answer', {
        sessionId: 'session-111',
        questionId: 'question-222',
        value: complexAnswer,
      });
    });

    it('handles submission errors', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Submission failed'));

      await expect(apiClient.submitAnswer('session-111', 'question-222', 'Yes')).rejects.toThrow(
        'Submission failed',
      );
    });
  });
});
