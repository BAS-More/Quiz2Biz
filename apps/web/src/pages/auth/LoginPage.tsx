/**
 * Login page component
 * Design: Modern SaaS - refined inputs, branded buttons, social auth
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '../../api';
import { useAuthStore } from '../../stores/auth';
import { Eye, EyeOff, Mail } from 'lucide-react';
import { OAuthButtons } from '../../components/auth/OAuthButtons';
import { Button } from '../../components/ui';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty: _isDirty },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      const response = await authApi.login(data);
      // Wait for login to complete and persist before navigating
      await login(response.accessToken, response.refreshToken, response.user);
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-semibold text-surface-900 text-center mb-1">Welcome back</h2>
      <p className="text-sm text-surface-500 text-center mb-6">
        Sign in to continue to your dashboard
      </p>

      {/* Status announcements for screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isSubmitting && 'Signing in, please wait...'}
      </div>

      {error && (
        <div
          className="mb-5 p-3 bg-danger-50 border border-danger-200 text-danger-700 rounded-xl text-sm flex items-center gap-2"
          role="alert"
          aria-live="assertive"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-surface-700">
            Email address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400">
              <Mail className="h-4 w-4" />
            </div>
            <input
              {...register('email')}
              type="email"
              id="email"
              autoComplete="email"
              required
              aria-required="true"
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
              data-testid="email-input"
              className="block w-full rounded-lg border border-surface-200 bg-white pl-10 pr-3.5 py-2.5 text-sm text-surface-900 placeholder:text-surface-400 hover:border-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
              placeholder="you@example.com"
            />
          </div>
          {errors.email && (
            <p id="email-error" className="text-sm text-danger-600" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-surface-700">
              Password
            </label>
            <Link
              to="/auth/forgot-password"
              className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              required
              aria-required="true"
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'password-error' : undefined}
              data-testid="password-input"
              className="block w-full rounded-lg border border-surface-200 bg-white px-3.5 py-2.5 text-sm text-surface-900 placeholder:text-surface-400 hover:border-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 pr-10 transition-colors"
              placeholder="Enter your password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-surface-400 hover:text-surface-600 transition-colors"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="text-sm text-danger-600" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          loading={isSubmitting}
          fullWidth
          size="lg"
          className="mt-2"
          data-testid="login-button"
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      {/* Divider */}
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-surface-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-white text-surface-400 uppercase tracking-wide">
              or continue with
            </span>
          </div>
        </div>
      </div>

      {/* OAuth */}
      <div className="mt-5">
        <OAuthButtons mode="login" onError={(err) => setError(err)} />
      </div>

      {/* Sign up link */}
      <p className="mt-6 text-center text-sm text-surface-500">
        Don't have an account?{' '}
        <Link
          to="/auth/register"
          className="font-medium text-brand-600 hover:text-brand-700 transition-colors"
        >
          Create one for free
        </Link>
      </p>
    </div>
  );
}
