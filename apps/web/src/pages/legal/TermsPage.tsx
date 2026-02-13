/**
 * Terms of Service page component
 * WCAG 2.1 Level AA compliant
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export function TermsPage() {
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
            <FileText className="h-8 w-8 text-blue-700" aria-hidden="true" />
            <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
          </div>

          <p className="text-sm text-gray-500 mb-8">Last updated: January 28, 2026</p>

          <div className="prose prose-blue max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing or using Quiz2Biz ("the Service"), you agree to be bound by these Terms
                of Service ("Terms"). If you do not agree to these Terms, you may not use the
                Service.
              </p>
              <p className="text-gray-700">
                These Terms apply to all users of the Service, including users who are also
                contributors of content, information, and other materials.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                2. Description of Service
              </h2>
              <p className="text-gray-700 mb-4">
                Quiz2Biz provides a business readiness assessment platform that enables
                organizations to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Complete structured questionnaires across multiple business dimensions</li>
                <li>Upload and manage evidence documentation</li>
                <li>Receive readiness scores and gap analysis</li>
                <li>Generate compliance and business documentation</li>
                <li>Track improvement progress over time</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Account Registration</h2>
              <p className="text-gray-700 mb-4">
                To use certain features of the Service, you must register for an account. You agree
                to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and promptly update your account information</li>
                <li>Maintain the security and confidentiality of your password</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use</li>
              </ul>
              <p className="text-gray-700 mt-4">
                We reserve the right to suspend or terminate accounts that violate these Terms or
                contain inaccurate information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                4. Subscription and Payment
              </h2>

              <h3 className="text-lg font-medium text-gray-800 mb-3">4.1 Subscription Plans</h3>
              <p className="text-gray-700 mb-4">
                The Service offers multiple subscription tiers (Free, Professional, Enterprise) with
                varying features and capabilities. Features and pricing are subject to change with
                reasonable notice.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-3">4.2 Billing</h3>
              <p className="text-gray-700 mb-4">
                Paid subscriptions are billed in advance on a monthly or annual basis. You authorize
                us to charge your payment method for all fees incurred.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-3">4.3 Cancellation</h3>
              <p className="text-gray-700 mb-4">
                You may cancel your subscription at any time. Cancellation takes effect at the end
                of your current billing period. No refunds are provided for partial billing periods.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-3">4.4 Free Trial</h3>
              <p className="text-gray-700">
                We may offer free trials at our discretion. At the end of a trial, you will be
                automatically enrolled in the free tier unless you select a paid subscription.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Acceptable Use</h2>
              <p className="text-gray-700 mb-4">You agree not to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Use the Service for any illegal or unauthorized purpose</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on intellectual property rights of others</li>
                <li>Upload malicious code, viruses, or harmful content</li>
                <li>Attempt to gain unauthorized access to the Service or other systems</li>
                <li>Interfere with or disrupt the Service or its infrastructure</li>
                <li>Scrape, harvest, or collect data from the Service without permission</li>
                <li>Impersonate another person or entity</li>
                <li>Use the Service to harass, abuse, or harm others</li>
                <li>Resell or redistribute the Service without authorization</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Intellectual Property</h2>

              <h3 className="text-lg font-medium text-gray-800 mb-3">6.1 Our Content</h3>
              <p className="text-gray-700 mb-4">
                The Service and its original content (excluding user-provided content), features,
                and functionality are owned by Quiz2Biz and are protected by copyright, trademark,
                and other intellectual property laws.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-3">6.2 Your Content</h3>
              <p className="text-gray-700 mb-4">
                You retain ownership of content you submit to the Service. By submitting content,
                you grant us a non-exclusive, worldwide, royalty-free license to use, store, and
                process your content solely for the purpose of providing the Service.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-3">6.3 Feedback</h3>
              <p className="text-gray-700">
                If you provide feedback, suggestions, or ideas, you grant us the right to use them
                without restriction or compensation to you.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Data and Privacy</h2>
              <p className="text-gray-700 mb-4">
                Your use of the Service is also governed by our{' '}
                <Link to="/privacy" className="text-blue-700 hover:text-blue-800">
                  Privacy Policy
                </Link>
                . By using the Service, you consent to the collection and use of your information as
                described in the Privacy Policy.
              </p>
              <p className="text-gray-700">
                You are responsible for ensuring you have the right to upload and share any content
                or data you provide through the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Service Availability</h2>
              <p className="text-gray-700 mb-4">
                We strive to maintain high availability but do not guarantee uninterrupted access.
                The Service may be temporarily unavailable due to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Scheduled maintenance (with advance notice when possible)</li>
                <li>Emergency maintenance or security updates</li>
                <li>Factors beyond our control (network outages, natural disasters)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                9. Disclaimer of Warranties
              </h2>
              <p className="text-gray-700 mb-4">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
                EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>MERCHANTABILITY</li>
                <li>FITNESS FOR A PARTICULAR PURPOSE</li>
                <li>NON-INFRINGEMENT</li>
                <li>ACCURACY OR RELIABILITY OF RESULTS</li>
              </ul>
              <p className="text-gray-700 mt-4">
                We do not warrant that the Service will meet your requirements, be error-free, or
                that defects will be corrected. Readiness scores and recommendations are for
                informational purposes only and do not constitute professional advice.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                10. Limitation of Liability
              </h2>
              <p className="text-gray-700 mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, QUIZ2BIZ SHALL NOT BE LIABLE FOR ANY
                INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT
                LIMITED TO:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Loss of profits, revenue, or data</li>
                <li>Business interruption</li>
                <li>Cost of substitute services</li>
                <li>Any damages arising from your use or inability to use the Service</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Our total liability shall not exceed the amount paid by you for the Service in the
                twelve (12) months preceding the claim.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Indemnification</h2>
              <p className="text-gray-700">
                You agree to indemnify, defend, and hold harmless Quiz2Biz and its officers,
                directors, employees, and agents from any claims, damages, losses, or expenses
                (including reasonable attorneys' fees) arising from your use of the Service, your
                content, or your violation of these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Termination</h2>
              <p className="text-gray-700 mb-4">
                We may terminate or suspend your account and access to the Service immediately,
                without prior notice, for any reason, including:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Violation of these Terms</li>
                <li>Conduct that we believe is harmful to other users or the Service</li>
                <li>Upon your request</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Upon termination, your right to use the Service ceases immediately. Provisions that
                by their nature should survive termination shall survive.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Governing Law</h2>
              <p className="text-gray-700">
                These Terms shall be governed by and construed in accordance with the laws of the
                State of Delaware, United States, without regard to its conflict of law provisions.
                Any disputes shall be resolved in the state or federal courts located in Delaware.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">14. Changes to Terms</h2>
              <p className="text-gray-700">
                We reserve the right to modify these Terms at any time. We will notify you of
                material changes by posting the updated Terms on this page and updating the "Last
                updated" date. Your continued use of the Service after changes constitutes
                acceptance of the modified Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">15. Severability</h2>
              <p className="text-gray-700">
                If any provision of these Terms is found to be unenforceable or invalid, that
                provision shall be limited or eliminated to the minimum extent necessary, and the
                remaining provisions shall remain in full force and effect.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">16. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have questions about these Terms, please contact us:
              </p>
              <address className="text-gray-700 not-italic">
                <strong>Quiz2Biz Legal Team</strong>
                <br />
                Email:{' '}
                <a href="mailto:legal@quiz2biz.com" className="text-blue-700 hover:text-blue-800">
                  legal@quiz2biz.com
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
              <Link to="/privacy" className="text-blue-700 hover:text-blue-800 font-medium">
                Privacy Policy
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
