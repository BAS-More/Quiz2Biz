/**
 * Privacy Policy page component
 * WCAG 2.1 Level AA compliant
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skip link for keyboard accessibility (WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-1 focus:left-1 focus:px-6 focus:py-3 focus:bg-blue-700 focus:text-white focus:rounded-md focus:font-semibold focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/"
            className="inline-flex items-center text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            Back to Home
          </Link>
        </div>
      </header>

      <main
        id="main-content"
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
        tabIndex={-1}
      >
        <div className="bg-white shadow rounded-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-8 w-8 text-blue-700" aria-hidden="true" />
            <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          </div>

          <p className="text-sm text-gray-500 mb-8">Last updated: January 28, 2026</p>

          <div className="prose prose-blue max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                Quiz2Biz ("we", "our", or "us") is committed to protecting your privacy. This
                Privacy Policy explains how we collect, use, disclose, and safeguard your
                information when you use our web application and services.
              </p>
              <p className="text-gray-700">
                Please read this Privacy Policy carefully. By using Quiz2Biz, you consent to the
                data practices described in this policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                2. Information We Collect
              </h2>

              <h3 className="text-lg font-medium text-gray-800 mb-3">2.1 Personal Information</h3>
              <p className="text-gray-700 mb-4">
                We may collect personal information that you voluntarily provide when using our
                services, including:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Name and email address</li>
                <li>Account credentials</li>
                <li>Company or organization information</li>
                <li>Billing and payment information</li>
                <li>Communication preferences</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3">2.2 Usage Information</h3>
              <p className="text-gray-700 mb-4">
                We automatically collect certain information when you access our services,
                including:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Device information (browser type, operating system)</li>
                <li>IP address and general location</li>
                <li>Pages visited and features used</li>
                <li>Time spent on pages</li>
                <li>Referring URLs</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3">2.3 Assessment Data</h3>
              <p className="text-gray-700">
                We collect the responses and data you provide through our questionnaires and
                assessments, including uploaded evidence files and documentation.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                3. How We Use Your Information
              </h2>
              <p className="text-gray-700 mb-4">We use the information we collect to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Process your assessments and generate readiness scores</li>
                <li>Create and manage your account</li>
                <li>Process payments and send billing information</li>
                <li>Send you updates, security alerts, and support messages</li>
                <li>Respond to your inquiries and provide customer support</li>
                <li>Analyze usage patterns to improve user experience</li>
                <li>Detect, prevent, and address technical issues or fraud</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Information Sharing</h2>
              <p className="text-gray-700 mb-4">
                We do not sell your personal information. We may share your information in the
                following circumstances:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>
                  <strong>Service Providers:</strong> With third-party vendors who assist in
                  providing our services (payment processors, cloud hosting, analytics)
                </li>
                <li>
                  <strong>Legal Requirements:</strong> When required by law, court order, or
                  governmental authority
                </li>
                <li>
                  <strong>Business Transfers:</strong> In connection with a merger, acquisition, or
                  sale of assets
                </li>
                <li>
                  <strong>With Your Consent:</strong> When you have given us explicit permission to
                  share
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement appropriate technical and organizational security measures to protect
                your data, including:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Encryption of data in transit (TLS 1.3) and at rest (AES-256)</li>
                <li>Regular security assessments and penetration testing</li>
                <li>Access controls and authentication requirements</li>
                <li>Secure cloud infrastructure (Azure with SOC 2 compliance)</li>
                <li>Regular backups and disaster recovery procedures</li>
              </ul>
              <p className="text-gray-700 mt-4">
                While we strive to protect your information, no method of transmission over the
                Internet is 100% secure. We cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
              <p className="text-gray-700">
                We retain your personal information for as long as necessary to provide our services
                and fulfill the purposes described in this policy. Assessment data is retained for
                the duration of your account plus 7 years for compliance purposes. You may request
                deletion of your data at any time, subject to legal retention requirements.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Your Rights</h2>
              <p className="text-gray-700 mb-4">
                Depending on your location, you may have the following rights regarding your
                personal data:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>
                  <strong>Access:</strong> Request a copy of your personal data
                </li>
                <li>
                  <strong>Correction:</strong> Request correction of inaccurate data
                </li>
                <li>
                  <strong>Deletion:</strong> Request deletion of your data
                </li>
                <li>
                  <strong>Portability:</strong> Request your data in a portable format
                </li>
                <li>
                  <strong>Objection:</strong> Object to certain processing of your data
                </li>
                <li>
                  <strong>Restriction:</strong> Request restriction of processing
                </li>
                <li>
                  <strong>Withdraw Consent:</strong> Withdraw previously given consent
                </li>
              </ul>
              <p className="text-gray-700 mt-4">
                To exercise these rights, please contact us at privacy@quiz2biz.com.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Cookies and Tracking</h2>
              <p className="text-gray-700 mb-4">We use cookies and similar technologies to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Maintain your session and authentication</li>
                <li>Remember your preferences</li>
                <li>Analyze usage patterns</li>
                <li>Improve our services</li>
              </ul>
              <p className="text-gray-700 mt-4">
                You can control cookies through your browser settings. Disabling cookies may affect
                the functionality of our services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                9. International Transfers
              </h2>
              <p className="text-gray-700">
                Your information may be transferred to and processed in countries other than your
                own. We ensure appropriate safeguards are in place, including Standard Contractual
                Clauses and compliance with applicable data protection laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Children's Privacy</h2>
              <p className="text-gray-700">
                Our services are not intended for individuals under 18 years of age. We do not
                knowingly collect personal information from children. If we become aware that we
                have collected data from a child, we will delete it promptly.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                11. Changes to This Policy
              </h2>
              <p className="text-gray-700">
                We may update this Privacy Policy from time to time. We will notify you of any
                material changes by posting the updated policy on this page and updating the "Last
                updated" date. Your continued use of our services after changes constitutes
                acceptance of the updated policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have questions or concerns about this Privacy Policy or our data practices,
                please contact us:
              </p>
              <address className="text-gray-700 not-italic">
                <strong>Quiz2Biz Privacy Team</strong>
                <br />
                Email:{' '}
                <a href="mailto:privacy@quiz2biz.com" className="text-blue-700 hover:text-blue-800">
                  privacy@quiz2biz.com
                </a>
                <br />
                Address: 123 Business Park, Suite 100
                <br />
                Technology City, TC 12345
                <br />
                United States
              </address>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-wrap gap-4">
              <Link to="/terms" className="text-blue-700 hover:text-blue-800 font-medium">
                Terms of Service
              </Link>
              <span className="text-gray-300" aria-hidden="true">
                |
              </span>
              <Link to="/auth/login" className="text-blue-700 hover:text-blue-800 font-medium">
                Sign In
              </Link>
              <span className="text-gray-300" aria-hidden="true">
                |
              </span>
              <Link to="/auth/register" className="text-blue-700 hover:text-blue-800 font-medium">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12" role="contentinfo">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Quiz2Biz. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
