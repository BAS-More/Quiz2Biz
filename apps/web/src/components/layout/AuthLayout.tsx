/**
 * Auth layout for login, register, and password reset pages
 * Design: Modern SaaS - gradient background, elevated card, trust signals
 */

import { Outlet, Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-surface-50 via-brand-50/30 to-accent-50/20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-brand-100/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent-100/30 blur-3xl" />
      </div>

      {/* Skip link for keyboard accessibility (WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-1 focus:left-1 focus:px-6 focus:py-3 focus:bg-brand-700 focus:text-white focus:rounded-md focus:font-semibold focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Logo & tagline */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Link to="/" className="flex items-center justify-center gap-2.5 group">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-600 shadow-elevated group-hover:shadow-float transition-shadow">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-white">
              <path
                d="M9 12l2 2 4-4"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">
            Quiz<span className="text-brand-600">2</span>Biz
          </h1>
        </Link>
        <p className="mt-2 text-center text-sm text-surface-500">
          Adaptive Client Questionnaire System
        </p>
      </div>

      {/* Form card */}
      <main
        id="main-content"
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
        tabIndex={-1}
      >
        <div className="bg-white dark:bg-surface-800 py-8 px-6 shadow-float rounded-2xl sm:px-10 border border-surface-200/50 animate-fade-in">
          <Outlet />
        </div>

        {/* Trust signals */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-surface-400">
          <div className="flex items-center gap-1">
            <Shield className="h-3.5 w-3.5" />
            <span>SSL Secured</span>
          </div>
          <span className="text-surface-300">|</span>
          <Link to="/privacy" className="hover:text-surface-600 transition-colors">
            Privacy Policy
          </Link>
          <span className="text-surface-300">|</span>
          <Link to="/terms" className="hover:text-surface-600 transition-colors">
            Terms
          </Link>
        </div>
      </main>

      <footer className="mt-8 text-center relative z-10" role="contentinfo">
        <p className="text-xs text-surface-400">
          &copy; {new Date().getFullYear()} Quiz2Biz. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
