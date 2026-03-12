/**
 * Register page component
 * Design: Modern SaaS - refined inputs, password strength, branded buttons
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '../../api';
import { useAuthStore } from '../../stores/auth';
import { Eye, EyeOff, CheckCircle, User, Mail } from 'lucide-react';
import { OAuthButtons } from '../../components/auth/OAuthButtons';
import { Button } from '../../components/ui';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
  });

  const password = watch('password', '');
  const confirmPassword = watch('confirmPassword', '');

  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword;
  const showPasswordMismatch = confirmPassword.length > 0 && !passwordsMatch;

  const passwordRequirements = [
    { label: 'At least 12 characters', met: password.length >= 12 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One special character (!@#$%^&*)', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const calculateStrength = () => {
    if (!password) return { score: 0, label: '', color: 'bg-surface-200' };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    if (
      password.length >= 12 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password)
    )
      score += 1;

    if (score <= 2) return { score: 25, label: 'Weak', color: 'bg-danger-500' };
    if (score <= 4) return { score: 50, label: 'Fair', color: 'bg-warning-500' };
    if (score <= 6) return { score: 75, label: 'Good', color: 'bg-brand-500' };
    return { score: 100, label: 'Strong', color: 'bg-success-500' };
  };

  const passwordStrength = calculateStrength();

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    try {
      const response = await authApi.register({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      // Wait for state to persist before navigating
      await login(response.accessToken, response.refreshToken, response.user);
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to create account. Please try again.');
    }
  };

  const inputClass = (hasError: boolean) =>
    `block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-surface-900 placeholder:text-surface-400 hover:border-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors ${hasError ? 'border-danger-500' : 'border-surface-200'
    }`;

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-semibold text-surface-900 text-center mb-1">
        Create your account
      </h2>
      <p className="text-sm text-surface-500 text-center mb-6">
        Start your readiness assessment journey
      </p>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isSubmitting && 'Creating your account, please wait...'}
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
        {/* Name */}
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-sm font-medium text-surface-700">
            Full name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400">
              <User className="h-4 w-4" />
            </div>
            <input
              {...register('name')}
              type="text"
              id="name"
              autoComplete="name"
              required
              aria-required="true"
              aria-invalid={errors.name ? 'true' : 'false'}
              aria-describedby={errors.name ? 'name-error' : undefined}
              className={`${inputClass(!!errors.name)} pl-10`}
              placeholder="John Doe"
            />
          </div>
          {errors.name && (
            <p id="name-error" className="text-sm text-danger-600" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Email */}
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
              className={`${inputClass(!!errors.email)} pl-10`}
              placeholder="you@example.com"
            />
          </div>
          {errors.email && (
            <p id="email-error" className="text-sm text-danger-600" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-surface-700">
            Password
          </label>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
              required
              aria-required="true"
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby="password-requirements"
              className={`${inputClass(!!errors.password)} pr-10`}
              placeholder="Create a strong password"
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

          {password && (
            <div className="space-y-2 pt-1">
              {/* Strength meter */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-surface-500">Password strength</span>
                  <span
                    className={`font-semibold ${passwordStrength.label === 'Weak'
                      ? 'text-danger-600'
                      : passwordStrength.label === 'Fair'
                        ? 'text-warning-600'
                        : passwordStrength.label === 'Good'
                          ? 'text-brand-600'
                          : 'text-success-600'
                      }`}
                    aria-live="polite"
                  >
                    {passwordStrength.label}
                  </span>
                </div>
                <div
                  className="h-1.5 bg-surface-100 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={passwordStrength.score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Password strength: ${passwordStrength.label}`}
                >
                  <div
                    className={`h-full transition-all duration-300 ease-out rounded-full ${passwordStrength.color}`}
                    style={{ width: `${passwordStrength.score}%` }}
                  />
                </div>
              </div>

              {/* Requirements checklist */}
              <div
                id="password-requirements"
                className="grid grid-cols-2 gap-x-2 gap-y-1"
                aria-label="Password requirements"
              >
                {passwordRequirements.map((req) => (
                  <div
                    key={req.label}
                    className={`flex items-center text-xs gap-1.5 ${req.met ? 'text-success-600' : 'text-surface-400'}`}
                  >
                    <CheckCircle
                      className={`h-3 w-3 shrink-0 ${req.met ? 'text-success-500' : 'text-surface-300'}`}
                    />
                    <span>{req.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {errors.password && (
            <p className="text-sm text-danger-600" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-surface-700">
            Confirm password
          </label>
          <input
            {...register('confirmPassword')}
            type="password"
            id="confirmPassword"
            autoComplete="new-password"
            required
            aria-required="true"
            aria-invalid={errors.confirmPassword || showPasswordMismatch ? 'true' : 'false'}
            aria-describedby={
              errors.confirmPassword || showPasswordMismatch ? 'confirmPassword-error' : undefined
            }
            className={inputClass(!!errors.confirmPassword || showPasswordMismatch)}
            placeholder="Confirm your password"
          />
          {showPasswordMismatch && !errors.confirmPassword && (
            <p
              id="confirmPassword-error"
              className="text-sm text-danger-600 flex items-center gap-1"
              role="alert"
            >
              Passwords do not match
            </p>
          )}
          {errors.confirmPassword && (
            <p id="confirmPassword-error" className="text-sm text-danger-600" role="alert">
              {errors.confirmPassword.message}
            </p>
          )}
          {confirmPassword.length > 0 && passwordsMatch && (
            <p className="text-sm text-success-600 flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Passwords match
            </p>
          )}
        </div>

        <Button type="submit" loading={isSubmitting} fullWidth size="lg" className="mt-2">
          {isSubmitting ? 'Creating account...' : 'Create account'}
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

      <div className="mt-5">
        <OAuthButtons mode="register" onError={(err) => setError(err)} />
      </div>

      <p className="mt-6 text-center text-sm text-surface-500">
        Already have an account?{' '}
        <Link
          to="/auth/login"
          className="font-medium text-brand-600 hover:text-brand-700 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
