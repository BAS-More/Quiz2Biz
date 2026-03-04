/**
 * @fileoverview Tests for OAuthController
 */
import { Test, TestingModule } from '@nestjs/testing';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';

describe('OAuthController', () => {
  let controller: OAuthController;
  let oauthService: jest.Mocked<OAuthService>;

  const mockAuthResponse = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/pic.jpg',
    },
    isNewUser: false,
  };

  beforeEach(async () => {
    const mockOAuthService = {
      authenticateWithGoogle: jest.fn(),
      authenticateWithMicrosoft: jest.fn(),
      getLinkedAccounts: jest.fn(),
      linkOAuthAccount: jest.fn(),
      unlinkOAuthAccount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OAuthController],
      providers: [{ provide: OAuthService, useValue: mockOAuthService }],
    }).compile();

    controller = module.get<OAuthController>(OAuthController);
    oauthService = module.get(OAuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('googleAuth', () => {
    it('should authenticate with Google', async () => {
      oauthService.authenticateWithGoogle.mockResolvedValue(mockAuthResponse);

      const result = await controller.googleAuth({ idToken: 'google-id-token' });

      expect(oauthService.authenticateWithGoogle).toHaveBeenCalledWith('google-id-token');
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('microsoftAuth', () => {
    it('should authenticate with Microsoft', async () => {
      oauthService.authenticateWithMicrosoft.mockResolvedValue(mockAuthResponse);

      const result = await controller.microsoftAuth({ accessToken: 'ms-access-token' });

      expect(oauthService.authenticateWithMicrosoft).toHaveBeenCalledWith('ms-access-token');
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('getLinkedAccounts', () => {
    it('should return linked accounts for user', async () => {
      const mockAccounts = [{ provider: 'google', email: 'test@gmail.com', linkedAt: new Date() }];
      oauthService.getLinkedAccounts.mockResolvedValue(mockAccounts);

      const mockUser = { id: 'user-1', email: 'test@example.com', role: 'CLIENT' as any };
      const result = await controller.getLinkedAccounts(mockUser);

      expect(oauthService.getLinkedAccounts).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockAccounts);
    });
  });

  describe('linkAccount', () => {
    it('should link Google account', async () => {
      oauthService.authenticateWithGoogle.mockResolvedValue(mockAuthResponse);
      oauthService.linkOAuthAccount.mockResolvedValue(undefined);

      const mockUser = { id: 'user-1', email: 'test@example.com', role: 'CLIENT' as any };
      const result = await controller.linkAccount(mockUser, {
        provider: 'google',
        idToken: 'google-id-token',
      });

      expect(oauthService.linkOAuthAccount).toHaveBeenCalled();
      expect(result).toEqual({ success: true, provider: 'google' });
    });

    it('should link Microsoft account', async () => {
      oauthService.authenticateWithMicrosoft.mockResolvedValue(mockAuthResponse);
      oauthService.linkOAuthAccount.mockResolvedValue(undefined);

      const mockUser = { id: 'user-1', email: 'test@example.com', role: 'CLIENT' as any };
      const result = await controller.linkAccount(mockUser, {
        provider: 'microsoft',
        accessToken: 'ms-access-token',
      });

      expect(oauthService.linkOAuthAccount).toHaveBeenCalled();
      expect(result).toEqual({ success: true, provider: 'microsoft' });
    });

    it('should throw error for invalid provider', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com', role: 'CLIENT' as any };

      await expect(
        controller.linkAccount(mockUser, {
          provider: 'github' as any,
        }),
      ).rejects.toThrow('Invalid provider or missing token');
    });
  });

  describe('unlinkAccount', () => {
    it('should unlink OAuth account', async () => {
      oauthService.unlinkOAuthAccount.mockResolvedValue(undefined);

      const mockUser = { id: 'user-1', email: 'test@example.com', role: 'CLIENT' as any };
      const result = await controller.unlinkAccount(mockUser, 'google');

      expect(oauthService.unlinkOAuthAccount).toHaveBeenCalledWith('user-1', 'google');
      expect(result).toEqual({ success: true, provider: 'google' });
    });
  });
});
