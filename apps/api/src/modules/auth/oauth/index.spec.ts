/**
 * @fileoverview Tests for modules/auth/oauth barrel exports
 */
import * as oauth from './index';

describe('modules/auth/oauth index', () => {
  it('should export OAuthService', () => {
    expect(oauth.OAuthService).toBeDefined();
  });

  it('should export OAuthController', () => {
    expect(oauth.OAuthController).toBeDefined();
  });
});
