/**
 * Documents page - View and manage generated documents
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Download, Eye, AlertCircle } from 'lucide-react';

export function DocumentsPage() {
  const navigate = useNavigate();

  // Placeholder document list
  const documents = [
    { id: '1', name: 'Technology Roadmap', type: 'PDF', date: '2026-01-28', status: 'Ready' },
    { id: '2', name: 'Business Plan', type: 'PDF', date: '2026-01-27', status: 'Ready' },
    { id: '3', name: 'Security Policy Pack', type: 'ZIP', date: '2026-01-26', status: 'Ready' },
  ];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        aria-label="Go back to dashboard"
      >
        <ArrowLeft className="h-5 w-5 mr-2" aria-hidden="true" />
        Back to Dashboard
      </button>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-gray-600 mt-1">
          View and download your generated documents and reports.
        </p>
      </div>

      {/* Documents list */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Generated Documents</h2>
        </div>

        {documents.length > 0 ? (
          <ul className="divide-y divide-gray-200" role="list">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 rounded-lg p-2">
                    <FileText className="h-6 w-6 text-blue-600" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{doc.name}</p>
                    <p className="text-sm text-gray-500">
                      {doc.type} • Generated {doc.date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded">
                    {doc.status}
                  </span>
                  <button
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    aria-label={`Preview ${doc.name}`}
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                  <button
                    className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                    aria-label={`Download ${doc.name}`}
                  >
                    <Download className="h-5 w-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-6 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" aria-hidden="true" />
            <p className="text-gray-500">No documents generated yet</p>
            <p className="text-sm text-gray-400">
              Complete a questionnaire to generate your first document.
            </p>
          </div>
        )}
      </div>

      {/* Coming soon notice */}
      <div className="flex items-center px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" aria-hidden="true" />
        <span className="text-yellow-700 text-sm">
          Document generation will be fully functional after completing assessments. These are
          sample documents for preview.
        </span>
      </div>
    </div>
  );
}

export default DocumentsPage;
