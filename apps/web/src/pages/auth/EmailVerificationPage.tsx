/**
 * Email Verification Page
 * Handles email verification via token from confirmation email
 * URL pattern: /auth/verify-email?token=xxx
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api';
import { CheckCircle, XCircle, Loader2, ArrowLeft, Mail } from 'lucide-react';

type VerificationState = 'verifying' | 'success' | 'error' | 'missing-token';

export function EmailVerificationPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [state, setState] = useState<VerificationState>(
        token ? 'verifying' : 'missing-token',
    );
    const [errorMessage, setErrorMessage] = useState<string>('');

    useEffect(() => {
        if (!token) {
            setState('missing-token');
            return;
        }

        let cancelled = false;

        const verify = async () => {
            try {
                await authApi.verifyEmail(token);
                if (!cancelled) {
                    setState('success');
                }
            } catch (err: unknown) {
                if (!cancelled) {
                    const apiError = err as { response?: { data?: { message?: string } } };
                    setErrorMessage(
                        apiError.response?.data?.message ||
                        'Email verification failed. The link may have expired.',
                    );
                    setState('error');
                }
            }
        };

        void verify();

        return () => {
            cancelled = true;
        };
    }, [token]);

    if (state === 'verifying') {
        return (
            <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                    <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying your email</h2>
                <p className="text-sm text-gray-600">
                    Please wait while we verify your email address...
                </p>
            </div>
        );
    }

    if (state === 'success') {
        return (
            <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified</h2>
                <p className="text-sm text-gray-600 mb-6">
                    Your email has been successfully verified. You can now access all features.
                </p>
                <Link
                    to="/auth/login"
                    className="inline-flex items-center justify-center w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Sign in to your account
                </Link>
            </div>
        );
    }

    if (state === 'missing-token') {
        return (
            <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                    <Mail className="h-6 w-6 text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Verification Link</h2>
                <p className="text-sm text-gray-600 mb-6">
                    This verification link is invalid or missing. Please check your email for the
                    correct link, or request a new verification email.
                </p>
                <Link
                    to="/auth/login"
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to sign in
                </Link>
            </div>
        );
    }

    return (
        <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-sm text-gray-600 mb-6">
                {errorMessage || 'Email verification failed. The link may have expired.'}
            </p>
            <Link
                to="/auth/login"
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
            >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to sign in
            </Link>
        </div>
    );
}

export default EmailVerificationPage;
