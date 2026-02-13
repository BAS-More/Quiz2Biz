/**
 * Help Center Page
 * Public page providing FAQ, documentation links, and support options
 */

import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { HelpCenter } from '../../components/help/HelpCenter';

export function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              Back to App
            </Link>

            <nav className="flex items-center space-x-6" aria-label="Help navigation">
              <a
                href="mailto:support@quiz2biz.com"
                className="text-sm text-gray-600 hover:text-blue-700 transition-colors"
              >
                Contact Support
              </a>
              <Link
                to="/terms"
                className="text-sm text-gray-600 hover:text-blue-700 transition-colors"
              >
                Terms
              </Link>
              <Link
                to="/privacy"
                className="text-sm text-gray-600 hover:text-blue-700 transition-colors"
              >
                Privacy
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <HelpCenter />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Quiz2Biz. All rights reserved.
            </p>

            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <a
                href="mailto:support@quiz2biz.com"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                support@quiz2biz.com
              </a>
              <span className="text-gray-300" aria-hidden="true">
                |
              </span>
              <Link to="/terms" className="text-sm text-gray-500 hover:text-gray-700">
                Terms of Service
              </Link>
              <span className="text-gray-300" aria-hidden="true">
                |
              </span>
              <Link to="/privacy" className="text-sm text-gray-500 hover:text-gray-700">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HelpPage;
