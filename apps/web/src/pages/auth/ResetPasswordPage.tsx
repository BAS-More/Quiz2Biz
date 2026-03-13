/**
 * Reset Password Page
 * Handles password reset via token from email link
 * URL pattern: /auth/reset-password?token=xxx
 */

import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '../../api';
import { Loader2, CheckCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const resetPasswordSchema = z
    .object({
        newPassword: z
            .string()
            .min(12, 'Password must be at least 12 characters')
            .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
            .regex(/[a-z]/, 'Must contain at least one lowercase letter')
            .regex(/[0-9]/, 'Must contain at least one number'),
        confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ResetPasswordForm>({
        resolver: zodResolver(resetPasswordSchema),
        mode: 'onTouched',
    });

    const onSubmit = async (data: ResetPasswordForm) => {
        if (!token) {
            setError('Invalid or missing reset token. Please request a new reset link.');
            return;
        }
        setError(null);
        try {
            await authApi.resetPassword({ token, newPassword: data.newPassword });
            setSuccess(true);
        } catch (err: unknown) {
            const apiError = err as { response?: { data?: { message?: string } } };
            setError(
                apiError.response?.data?.message ||
                'Failed to reset password. The link may have expired.',
            );
        }
    };

    if (!token) {
        return (
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Reset Link</h2>
                <p className="text-sm text-gray-600 mb-6">
                    This password reset link is invalid or has expired. Please request a new one.
                </p>
                <Link
                    to="/auth/forgot-password"
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                    Request new reset link
                </Link>
            </div>
        );
    }

    if (success) {
        return (
            <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Successful</h2>
                <p className="text-sm text-gray-600 mb-6">
                    Your password has been updated. You can now sign in with your new password.
                </p>
                <button
                    onClick={() => navigate('/auth/login')}
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Go to sign in
                </button>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                Set new password
            </h2>
            <p className="text-sm text-gray-600 text-center mb-6">
                Enter your new password below. It must be at least 12 characters.
            </p>

            {error && (
                <div
                    className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm"
                    role="alert"
                >
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                        New password
                    </label>
                    <div className="relative mt-1">
                        <input
                            {...register('newPassword')}
                            type={showPassword ? 'text' : 'password'}
                            id="newPassword"
                            autoComplete="new-password"
                            aria-required="true"
                            aria-invalid={errors.newPassword ? 'true' : 'false'}
                            aria-describedby={errors.newPassword ? 'newPassword-error' : undefined}
                            data-testid="new-password-input"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10"
                            placeholder="Enter new password"
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {errors.newPassword && (
                        <p id="newPassword-error" className="mt-1 text-sm text-red-600" role="alert">
                            {errors.newPassword.message}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                        Confirm password
                    </label>
                    <input
                        {...register('confirmPassword')}
                        type="password"
                        id="confirmPassword"
                        autoComplete="new-password"
                        aria-required="true"
                        aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                        aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
                        data-testid="confirm-password-input"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Confirm new password"
                    />
                    {errors.confirmPassword && (
                        <p id="confirmPassword-error" className="mt-1 text-sm text-red-600" role="alert">
                            {errors.confirmPassword.message}
                        </p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    data-testid="submit-new-password-button"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Resetting...
                        </>
                    ) : (
                        'Reset password'
                    )}
                </button>
            </form>

            <div className="mt-6 text-center">
                <Link
                    to="/auth/login"
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to sign in
                </Link>
            </div>
        </div>
    );
}

export default ResetPasswordPage;
