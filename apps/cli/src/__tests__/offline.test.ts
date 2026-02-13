import { offlineCommand } from '../commands/offline';

jest.mock('../lib/config');
jest.mock('../lib/api-client');

describe('Offline Command', () => {
  it('should be defined', () => {
    expect(offlineCommand).toBeDefined();
    expect(offlineCommand.name()).toBe('offline');
  });

  it('should have correct description', () => {
    expect(offlineCommand.description()).toBe('Offline mode operations');
  });

  it('should have sync subcommand', () => {
    const commands = offlineCommand.commands;
    const syncCmd = commands.find((cmd) => cmd.name() === 'sync');
    expect(syncCmd).toBeDefined();
    expect(syncCmd?.description()).toBe('Download session data for offline use');
  });

  it('should have import subcommand', () => {
    const commands = offlineCommand.commands;
    const importCmd = commands.find((cmd) => cmd.name() === 'import');
    expect(importCmd).toBeDefined();
    expect(importCmd?.description()).toBe('Import session data from JSON file');
  });

  it('should have export subcommand', () => {
    const commands = offlineCommand.commands;
    const exportCmd = commands.find((cmd) => cmd.name() === 'export');
    expect(exportCmd).toBeDefined();
    expect(exportCmd?.description()).toBe('Export offline session data to JSON file');
  });

  it('should have list subcommand', () => {
    const commands = offlineCommand.commands;
    const listCmd = commands.find((cmd) => cmd.name() === 'list');
    expect(listCmd).toBeDefined();
    expect(listCmd?.description()).toBe('List all offline sessions');
  });

  it('should have clear subcommand', () => {
    const commands = offlineCommand.commands;
    const clearCmd = commands.find((cmd) => cmd.name() === 'clear');
    expect(clearCmd).toBeDefined();
    expect(clearCmd?.description()).toBe('Clear offline data (all or specific session)');
  });
});
