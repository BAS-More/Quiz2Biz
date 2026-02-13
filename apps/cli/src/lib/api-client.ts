/**
 * API Client for Quiz2Biz API
 */

import axios, { AxiosInstance } from 'axios';
import { Config } from './config';

export class ApiClient {
  private client: AxiosInstance;

  constructor(config: Config) {
    const baseURL = config.get('apiUrl') || 'http://localhost:3000/api';
    const token = config.get('apiToken');

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 30000,
    });
  }

  async getScore(sessionId: string): Promise<ScoreResponse> {
    const response = await this.client.get(`/scoring/${sessionId}`);
    return response.data;
  }

  async getHeatmap(sessionId: string): Promise<HeatmapResponse> {
    const response = await this.client.get(`/heatmap/${sessionId}`);
    return response.data;
  }

  async getNextQuestions(
    sessionId: string,
    options: {
      count?: number;
      dimension?: string;
      persona?: string;
    },
  ): Promise<NextQuestionsResponse> {
    const params = new URLSearchParams();
    if (options.count) {
      params.append('count', options.count.toString());
    }
    if (options.dimension) {
      params.append('dimension', options.dimension);
    }
    if (options.persona) {
      params.append('persona', options.persona);
    }

    const response = await this.client.get(
      `/adaptive-logic/next/${sessionId}?${params.toString()}`,
    );
    return response.data;
  }

  async submitAnswer(sessionId: string, questionId: string, answer: unknown): Promise<void> {
    await this.client.post(`/questionnaire/answer`, {
      sessionId,
      questionId,
      value: answer,
    });
  }

  /**
   * Generic GET method for arbitrary endpoints
   */
  async get<T = any>(url: string, config?: any): Promise<{ data: T }> {
    return this.client.get(url, config);
  }

  /**
   * Generic POST method for arbitrary endpoints
   */
  async post<T = any>(url: string, data?: any, config?: any): Promise<{ data: T }> {
    return this.client.post(url, data, config);
  }
}

interface ScoreResponse {
  overallScore: number;
  dimensions?: Array<{
    name: string;
    score: number;
    questionsAnswered: number;
    totalQuestions: number;
  }>;
  progress?: {
    sectionsLeft: number;
    questionsLeft: number;
    currentSectionProgress: number;
    currentSectionTotal: number;
  };
}

interface HeatmapResponse {
  sessionName: string;
  overallScore: number;
  dimensions: Array<{
    name: string;
    key: string;
    score: number;
    questionsAnswered: number;
    totalQuestions: number;
    questions: Array<{
      id: string;
      text: string;
      severity: number;
      coverage: number;
    }>;
  }>;
}

interface NextQuestionsResponse {
  questions: Array<{
    id: string;
    text: string;
    dimension: string;
    persona: string;
    severity: number;
    priority: string;
    bestPractice?: string;
  }>;
  totalRemaining: number;
  topDimension?: {
    name: string;
    remaining: number;
  };
}
