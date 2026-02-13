/**
 * Configuration Manager for Quiz2Biz CLI
 *
 * Uses Conf for persistent local storage
 */

import Conf from 'conf';

interface ConfigSchema {
  apiUrl: string;
  apiToken: string;
  defaultSession: string;
  offlineData: Record<string, OfflineSessionData>;
}

export interface OfflineSessionData {
  sessionId: string;
  syncedAt: string;
  score: { overallScore: number };
  heatmap: unknown;
  questions: unknown[];
}

export class Config {
  private store: Conf<ConfigSchema>;

  constructor() {
    this.store = new Conf<ConfigSchema>({
      projectName: 'quiz2biz-cli',
      defaults: {
        apiUrl: 'http://localhost:3000/api',
        apiToken: '',
        defaultSession: '',
        offlineData: {},
      },
    });
  }

  get(key: keyof ConfigSchema): string {
    const value = this.store.get(key);
    if (typeof value === 'string') {
      return value;
    }
    return '';
  }

  set(key: keyof ConfigSchema, value: string): void {
    this.store.set(key, value as never);
  }

  getAll(): Record<string, unknown> {
    return this.store.store as unknown as Record<string, unknown>;
  }

  reset(): void {
    this.store.clear();
  }

  getPath(): string {
    return this.store.path;
  }

  // Offline data management
  getOfflineData(sessionId: string): OfflineSessionData | undefined {
    const offlineData = this.store.get('offlineData') || {};
    return offlineData[sessionId];
  }

  setOfflineData(sessionId: string, data: OfflineSessionData): void {
    const offlineData = this.store.get('offlineData') || {};
    offlineData[sessionId] = data;
    this.store.set('offlineData', offlineData);
  }

  listOfflineSessions(): OfflineSessionData[] {
    const offlineData = this.store.get('offlineData') || {};
    return Object.values(offlineData);
  }

  clearOfflineData(sessionId: string): void {
    const offlineData = this.store.get('offlineData') || {};
    delete offlineData[sessionId];
    this.store.set('offlineData', offlineData);
  }

  clearAllOfflineData(): void {
    this.store.set('offlineData', {});
  }
}
