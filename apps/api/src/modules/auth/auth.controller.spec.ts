import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CsrfService } from '../../common/guards/csrf.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let module: TestingModule;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerificationEmail: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
  };

  const mockCsrfService = {
    generateToken: jest.fn().mockReturnValue('csrf-token-123'),
    getCookieOptions: jest.fn().mockReturnValue({ httpOnly: true, secure: true }),
  };

  const mockRequest = {
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
  };

  const mockResponse = {
    cookie: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: CsrfService, useValue: mockCsrfService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        organizationName: 'Test Org',
      };

      const mockResponse = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        expiresIn: 3600,
        user: { id: 'user-123', email: 'test@example.com' },
      };

      mockAuthService.register.mockResolvedValue(mockResponse);

      const result = await controller.register(registerDto);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const mockTokenResponse = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        expiresIn: 3600,
        user: { id: 'user-123', email: 'test@example.com' },
      };

      mockAuthService.login.mockResolvedValue(mockTokenResponse);

      const result = await controller.login(loginDto, mockRequest as any);

      expect(result).toEqual(mockTokenResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith({
        ...loginDto,
        ip: '127.0.0.1',
      });
    });
  });

  describe('refresh', () => {
    it('should refresh access token', async () => {
      const refreshDto = { refreshToken: 'refresh-token-456' };

      const mockRefreshResponse = {
        accessToken: 'new-access-token-789',
        expiresIn: 3600,
      };

      mockAuthService.refresh.mockResolvedValue(mockRefreshResponse);

      const result = await controller.refresh(refreshDto);

      expect(result).toEqual(mockRefreshResponse);
      expect(mockAuthService.refresh).toHaveBeenCalledWith('refresh-token-456');
    });
  });

  describe('logout', () => {
    it('should logout user and invalidate refresh token', async () => {
      const logoutDto = { refreshToken: 'refresh-token-456' };

      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(logoutDto);

      expect(result).toEqual({ message: 'Successfully logged out' });
      expect(mockAuthService.logout).toHaveBeenCalledWith('refresh-token-456');
    });
  });

  describe('getMe', () => {
    it('should return current user profile', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        organizationId: 'org-456',
      };

      const result = controller.getMe(mockUser as any);

      expect(result).toEqual(mockUser);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      const verifyDto = { token: 'valid-verification-token' };

      mockAuthService.verifyEmail.mockResolvedValue({
        message: 'Email verified successfully',
        verified: true,
      });

      const result = await controller.verifyEmail(verifyDto);

      expect(result.verified).toBe(true);
      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('valid-verification-token');
    });
  });

  describe('resendVerification', () => {
    it('should resend verification email', async () => {
      const resendDto = { email: 'test@example.com' };

      mockAuthService.resendVerificationEmail.mockResolvedValue({
        message: 'Verification email sent if account exists',
      });

      const result = await controller.resendVerification(resendDto);

      expect(result.message).toContain('Verification');
      expect(mockAuthService.resendVerificationEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email', async () => {
      const forgotDto = { email: 'test@example.com' };

      mockAuthService.requestPasswordReset.mockResolvedValue({
        message: 'Password reset email sent if account exists',
      });

      const result = await controller.forgotPassword(forgotDto);

      expect(result.message).toContain('Password reset');
      expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const resetDto = {
        token: 'valid-reset-token',
        newPassword: 'NewPassword123!',
      };

      mockAuthService.resetPassword.mockResolvedValue({
        message: 'Password reset successfully',
      });

      const result = await controller.resetPassword(resetDto);

      expect(result.message).toContain('Password reset');
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        'valid-reset-token',
        'NewPassword123!',
      );
    });
  });

  describe('getCsrfToken', () => {
    it('should generate and return CSRF token', () => {
      const result = controller.getCsrfToken(mockResponse as any);

      expect(result.csrfToken).toBe('csrf-token-123');
      expect(result.message).toContain('X-CSRF-Token');
      expect(mockResponse.cookie).toHaveBeenCalled();
    });
  });

  describe('uncovered branches', () => {
    it('should fall back to connection.remoteAddress when request.ip is falsy', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'Password123!',
      };
      const requestNoIp = {
        ip: '',
        connection: { remoteAddress: '192.168.1.1' },
      };

      mockAuthService.login.mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
        expiresIn: 3600,
        user: { id: 'u1', email: 'test@example.com' },
      });

      await controller.login(loginDto, requestNoIp as any);

      expect(mockAuthService.login).toHaveBeenCalledWith({
        ...loginDto,
        ip: '192.168.1.1',
      });
    });

    it('should fall back to "unknown" when both ip and remoteAddress are falsy', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'Password123!',
      };
      const requestNoIpNoAddr = {
        ip: '',
        connection: { remoteAddress: '' },
      };

      mockAuthService.login.mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
        expiresIn: 3600,
        user: { id: 'u1', email: 'test@example.com' },
      });

      await controller.login(loginDto, requestNoIpNoAddr as any);

      expect(mockAuthService.login).toHaveBeenCalledWith({
        ...loginDto,
        ip: 'unknown',
      });
    });
  });
});
