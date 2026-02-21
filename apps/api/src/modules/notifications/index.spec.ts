/**
 * @fileoverview Tests for modules/notifications barrel exports
 */
import * as notifications from './index';

describe('modules/notifications index', () => {
  it('should export NotificationModule', () => {
    expect(notifications.NotificationModule).toBeDefined();
  });

  it('should export NotificationService', () => {
    expect(notifications.NotificationService).toBeDefined();
  });

  it('should export DTOs', () => {
    expect(notifications.SendEmailDto).toBeDefined();
  });
});
