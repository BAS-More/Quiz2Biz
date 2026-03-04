/**
 * Documents page — View generated documents and request new generation.
 * Loads document types from API (project-type-scoped when a session is selected).
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileDown,
  Briefcase,
  TrendingUp,
  DollarSign,
  Presentation,
  Bot,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../../components/ui';
import { useQuestionnaireStore } from '../../stores/questionnaire';
import {
  listDocumentTypes,
  getSessionDocumentTypes,
  requestDocumentGeneration,
  type DocumentType,
} from '../../api/documents';

const DOC_TYPE_ICONS: Record<string, typeof FileText> = {
  'business-plan-doc': Briefcase,
  'marketing-strategy-doc': TrendingUp,
  'financial-projections-doc': DollarSign,
  'investor-pitch-doc': Presentation,
  'ai-prompts-doc': Bot,
  'ms-strategy-doc': TrendingUp,
  'fp-report-doc': DollarSign,
};

export function DocumentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const { sessions, loadSessions } = useQuestionnaireStore();

  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [generatingSlug, setGeneratingSlug] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(sessionId);

  const completedSessions = sessions.filter((s) => s.status === 'COMPLETED');

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Load document types when selected session changes
  useEffect(() => {
    async function loadTypes() {
      setIsLoadingTypes(true);
      try {
        const types = selectedSessionId
          ? await getSessionDocumentTypes(selectedSessionId)
          : await listDocumentTypes();
        setDocumentTypes(types);
      } catch {
        // Fallback: load all types
        try {
          const types = await listDocumentTypes();
          setDocumentTypes(types);
        } catch {
          setDocumentTypes([]);
        }
      } finally {
        setIsLoadingTypes(false);
      }
    }
    loadTypes();
  }, [selectedSessionId]);

  const handleSelectSession = useCallback(
    (id: string) => {
      setSelectedSessionId(id);
      setSearchParams({ sessionId: id });
      setGenerationError(null);
    },
    [setSearchParams],
  );

  const handleGenerate = useCallback(
    async (docType: DocumentType) => {
      if (!selectedSessionId) {
        setGenerationError('Please select a session first.');
        return;
      }
      setGeneratingSlug(docType.slug);
      setGenerationError(null);
      try {
        await requestDocumentGeneration(selectedSessionId, docType.id, 'DOCX');
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
            ?.message ??
          (err as { message?: string })?.message ??
          'Generation failed';
        setGenerationError(message);
      } finally {
        setGeneratingSlug(null);
      }
    },
    [selectedSessionId],
  );

  const selectedSession = completedSessions.find((s) => s.id === selectedSessionId);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center text-surface-500 hover:text-surface-900 transition-colors"
        aria-label="Go back to dashboard"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden="true" />
        <span className="text-sm">Back to Dashboard</span>
      </button>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Documents</h1>
        <p className="text-surface-500 mt-1">
          Generate professional business documents from your questionnaire answers.
        </p>
      </div>

      {/* Error display */}
      {generationError && (
        <div className="flex items-center px-4 py-3 bg-danger-50 border border-danger-200 rounded-xl">
          <AlertCircle className="h-5 w-5 text-danger-600 mr-3 flex-shrink-0" />
          <p className="text-sm text-danger-700">{generationError}</p>
        </div>
      )}

      {/* Session selector */}
      {completedSessions.length === 0 ? (
        <div className="flex items-center px-4 py-3 bg-warning-50 border border-warning-200 rounded-xl">
          <AlertCircle className="h-5 w-5 text-warning-600 mr-3 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-warning-800">No completed projects</p>
            <p className="text-xs text-warning-600 mt-0.5">
              Complete a questionnaire to unlock document generation.{' '}
              <button onClick={() => navigate('/idea')} className="underline font-medium">
                Start a new project
              </button>
            </p>
          </div>
        </div>
      ) : (
        <Card padding="none">
          <div className="px-6 py-4 border-b border-surface-100">
            <h2 className="text-base font-semibold text-surface-900">Select a Project</h2>
            <p className="text-xs text-surface-400 mt-0.5">
              Choose which project to generate documents from.
            </p>
          </div>
          <div className="p-4 space-y-2">
            {completedSessions.slice(0, 5).map((session) => {
              const isSelected = selectedSessionId === session.id;
              return (
                <button
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  className={`flex items-center justify-between w-full p-3 rounded-xl border transition-colors text-left ${
                    isSelected
                      ? 'border-brand-400 bg-brand-50'
                      : 'border-surface-100 hover:border-brand-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-brand-100' : 'bg-success-50'
                      }`}
                    >
                      <CheckCircle2
                        className={`w-4 h-4 ${isSelected ? 'text-brand-600' : 'text-success-600'}`}
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-surface-900 truncate block">
                        {session.projectTypeName ?? session.persona ?? 'Project'}
                      </span>
                      <span className="text-xs text-surface-400">
                        Score: {session.readinessScore?.toFixed(0) ?? 'N/A'}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-surface-400">
                      {new Date(session.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    {isSelected && (
                      <span className="px-2 py-0.5 bg-brand-600 text-white text-xs font-medium rounded-full">
                        Selected
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Document type grid */}
      <div>
        <h2 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-600" />
          Available Document Types
          {selectedSession && (
            <span className="text-sm font-normal text-surface-400">
              for {selectedSession.projectTypeName ?? 'selected project'}
            </span>
          )}
        </h2>

        {isLoadingTypes ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-5 h-5 text-surface-400 animate-spin" />
            <span className="ml-2 text-sm text-surface-400">Loading document types...</span>
          </div>
        ) : documentTypes.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-10 h-10 text-surface-300 mx-auto mb-3" />
            <p className="text-sm text-surface-500">
              {selectedSessionId
                ? 'No document types available for this project type.'
                : 'No document types configured. Select a project to see available documents.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documentTypes.map((docType) => {
              const Icon = DOC_TYPE_ICONS[docType.slug] || FileText;
              const isGenerating = generatingSlug === docType.slug;
              const canGenerate = !!selectedSessionId;

              return (
                <Card key={docType.id} hover className="flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-surface-900">{docType.name}</h3>
                      <span className="text-xs text-surface-400">
                        ~{docType.estimatedPages ?? '?'} pages
                      </span>
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-100 text-surface-600">
                      {docType.category}
                    </span>
                  </div>
                  <p className="text-xs text-surface-500 mb-4 flex-1">{docType.description}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGenerate(docType)}
                      disabled={isGenerating || !canGenerate}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Generate DOCX
                        </>
                      )}
                    </button>
                    <button
                      disabled
                      title="PDF export coming soon"
                      className="inline-flex items-center justify-center gap-1 px-3 py-2 border border-surface-200 text-surface-400 text-xs font-medium rounded-lg opacity-50 cursor-not-allowed transition-all"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      PDF
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentsPage;
