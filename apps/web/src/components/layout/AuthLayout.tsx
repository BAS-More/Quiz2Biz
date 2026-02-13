/**
 * Auth layout for login, register, and password reset pages
 */

import { Outlet, Link } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      {/* Skip link for keyboard accessibility (WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-1 focus:left-1 focus:px-6 focus:py-3 focus:bg-blue-700 focus:text-white focus:rounded-md focus:font-semibold focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center">
          <h1 className="text-3xl font-bold text-blue-600">Quiz2Biz</h1>
        </Link>
        <p className="mt-2 text-center text-sm text-gray-600">
          Adaptive Client Questionnaire System
        </p>
      </div>

      <main id="main-content" className="mt-8 sm:mx-auto sm:w-full sm:max-w-md" tabIndex={-1}>
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <Outlet />
        </div>
      </main>

      <footer className="mt-8 text-center" role="contentinfo">
        <p className="text-xs text-gray-500">
          &copy; {new Date().getFullYear()} Quiz2Biz. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
