/**
 * Questionnaire page - Persona-driven adaptive assessment
 * Wires to real session API, scoring engine, and NQS algorithm
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertTriangle, Loader2, Target, Users } from 'lucide-react';
import { useQuestionnaireStore } from '../../stores/questionnaire';
import { questionnaireApi, type Persona, type QuestionnaireListItem } from '../../api/questionnaire';

const PERSONA_OPTIONS: { value: Persona; label: string; description: string }[] = [
  { value: 'CTO', label: 'CTO', description: 'Architecture, security, DevOps, quality' },
  { value: 'CFO', label: 'CFO', description: 'Finance, cost management, ROI analysis' },
  { value: 'CEO', label: 'CEO', description: 'Strategy, vision, stakeholder alignment' },
  { value: 'BA', label: 'Business Analyst', description: 'Requirements, specs, data, service ops' },
  { value: 'POLICY', label: 'Policy Writer', description: 'Privacy, legal, compliance, people & change' },
];

export function QuestionnairePage() {
  const navigate = useNavigate();
  const { action } = useParams<{ action?: string }>();
  const [searchParams] = useSearchParams();
  const sessionIdParam = searchParams.get('sessionId');
  const isNew = action === 'new';

  const {
    session,
    currentQuestions,
    currentSection,
    readinessScore,
    canComplete,
    isComplete,
    isLoading,
    error,
    nqsHint,
    createSession,
    continueSession,
    submitResponse,
    completeSession,
    clearError,
  } = useQuestionnaireStore();

  const [questionnaires, setQuestionnaires] = useState<QuestionnaireListItem[]>([]);
  const [questionnaireLoadError, setQuestionnaireLoadError] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona>('CTO');
  const [currentValue, setCurrentValue] = useState<unknown>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());

  // Load questionnaires on mount for "new" view
  useEffect(() => {
    if (isNew) {
      questionnaireApi.listQuestionnaires().then(setQuestionnaires).catch(() => setQuestionnaireLoadError(true));
    }
  }, [isNew]);

  // Resume session if sessionId is in URL (or switch sessions)
  useEffect(() => {
    if (sessionIdParam && session?.id !== sessionIdParam) {
      continueSession(sessionIdParam);
    }
  }, [sessionIdParam, session?.id, continueSession]);

  // Reset timer when question changes (use question ID, not array reference)
  const currentQuestionId = currentQuestions[0]?.id;
  useEffect(() => {
    setStartTime(Date.now());
    setCurrentValue(null);
  }, [currentQuestionId]);

  const handleStartSession = useCallback(
    async (questionnaireId: string) => {
      await createSession(questionnaireId, selectedPersona);
    },
    [createSession, selectedPersona],
  );

  const isValueEmpty =
    currentValue === null ||
    currentValue === '' ||
    (typeof currentValue === 'string' && currentValue.trim() === '') ||
    (Array.isArray(currentValue) && currentValue.length === 0);

  const handleSubmit = useCallback(async () => {
    if (!session || !currentQuestions[0] || isValueEmpty) return;
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    await submitResponse(session.id, currentQuestions[0].id, currentValue, timeSpent);
  }, [session, currentQuestions, currentValue, isValueEmpty, startTime, submitResponse]);

  const handleComplete = useCallback(async () => {
    if (!session) return;
    await completeSession(session.id);
  }, [session, completeSession]);

  // --- NEW SESSION: Persona selector + questionnaire picker ---
  if (isNew && !session) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="Go back to dashboard"
        >
          <ArrowLeft className="h-5 w-5 mr-2" aria-hidden="true" />
          Back to Dashboard
        </button>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Start New Assessment</h1>
          <p className="text-gray-600 mt-1">Select your persona and begin the readiness assessment.</p>
        </div>

        {/* Persona selector */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2 text-blue-600" aria-hidden="true" />
            Select Your Persona
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {PERSONA_OPTIONS.map((p) => (
              <button
                key={p.value}
                onClick={() => setSelectedPersona(p.value)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedPersona === p.value
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900">{p.label}</div>
                <div className="text-xs text-gray-500 mt-1">{p.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Questionnaire list */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Questionnaires</h2>
          {questionnaireLoadError ? (
            <p className="text-red-500">Failed to load questionnaires. Please refresh the page.</p>
          ) : questionnaires.length === 0 ? (
            <p className="text-gray-500">Loading questionnaires...</p>
          ) : (
            <div className="space-y-3">
              {questionnaires.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <h3 className="font-medium text-gray-900">{q.name}</h3>
                    <p className="text-sm text-gray-500">
                      {q.totalQuestions} questions | {q.sections.length} sections
                      {q.estimatedTime && ` | ~${q.estimatedTime} min`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleStartSession(q.id)}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? 'Starting...' : 'Start'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button onClick={clearError} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- ACTIVE SESSION: Question flow with score tracking ---
  if (isLoading && !session) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading session...</span>
      </div>
    );
  }

  if (isComplete && session) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Assessment Complete!</h1>
          <p className="text-gray-600 mb-4">
            Your readiness score: <span className="text-2xl font-bold text-green-600">{readinessScore?.toFixed(1) ?? 'N/A'}%</span>
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Dashboard
            </button>
            <button
              onClick={() => navigate('/questionnaire/new')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Start New Assessment
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = currentQuestions[0];
  const progress = session?.progress;

  return (
    <div className="space-y-6">
      {/* Header with back + score */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="Go back to dashboard"
        >
          <ArrowLeft className="h-5 w-5 mr-2" aria-hidden="true" />
          Back to Dashboard
        </button>

        {readinessScore !== null && (
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <span className="text-sm text-gray-600">Readiness:</span>
            <span
              className={`text-lg font-bold ${
                readinessScore >= 95 ? 'text-green-600' : readinessScore >= 70 ? 'text-yellow-600' : 'text-red-600'
              }`}
            >
              {readinessScore.toFixed(1)}%
            </span>
            <span className="text-xs text-gray-400">/ 95% required</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {progress && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>
              {currentQuestion ? (
                <>
                  Question{' '}
                  {Math.min(
                    progress.answeredQuestions + 1,
                    progress.totalQuestions || 1
                  )}{' '}
                  of {progress.totalQuestions}
                </>
              ) : (
                <>All {progress.totalQuestions} questions completed</>
              )}
            </span>
            <span>{progress.percentage}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          {currentSection && (
            <p className="text-xs text-gray-500 mt-1">
              Section: {currentSection.name} ({currentSection.answeredInSection}/{currentSection.questionsInSection})
            </p>
          )}
        </div>
      )}

      {/* NQS hint */}
      {nqsHint && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <span className="font-medium text-blue-800">Next priority question</span>
          <span className="text-blue-600"> in {nqsHint.dimensionKey}:</span>
          <span className="text-blue-700"> +{nqsHint.expectedScoreLift.toFixed(1)} pts potential</span>
        </div>
      )}

      {/* Current question */}
      {currentQuestion ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{currentQuestion.text}</h2>
          {currentQuestion.helpText && (
            <p className="text-sm text-gray-500 mb-4">{currentQuestion.helpText}</p>
          )}

          {/* Question input based on type */}
          <div className="mt-4">
            {currentQuestion.type === 'SINGLE_CHOICE' && currentQuestion.options ? (
              <div className="space-y-2">
                {currentQuestion.options.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                      currentValue === opt.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="answer"
                      value={opt.id}
                      checked={currentValue === opt.id}
                      onChange={() => setCurrentValue(opt.id)}
                      className="mr-3"
                    />
                    <div>
                      <span className="text-gray-900">{opt.label}</span>
                      {opt.description && <p className="text-xs text-gray-500">{opt.description}</p>}
                    </div>
                  </label>
                ))}
              </div>
            ) : currentQuestion.type === 'SCALE' ? (
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCurrentValue(n)}
                    className={`w-12 h-12 rounded-lg border-2 font-bold transition-colors ${
                      currentValue === n ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            ) : currentQuestion.type === 'MULTIPLE_CHOICE' && currentQuestion.options ? (
              <div className="space-y-2">
                {currentQuestion.options.map((opt) => {
                  const selected = Array.isArray(currentValue) && (currentValue as string[]).includes(opt.id);
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {
                          const arr = Array.isArray(currentValue) ? [...(currentValue as string[])] : [];
                          if (selected) {
                            setCurrentValue(arr.filter((v) => v !== opt.id));
                          } else {
                            setCurrentValue([...arr, opt.id]);
                          }
                        }}
                        className="mr-3"
                      />
                      <span className="text-gray-900">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <textarea
                value={typeof currentValue === 'string' ? currentValue : ''}
                onChange={(e) => setCurrentValue(e.target.value)}
                placeholder={currentQuestion.placeholder ?? 'Type your answer...'}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                rows={4}
              />
            )}
          </div>

          {/* Submit button */}
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {currentQuestion.required && <span className="text-red-500">* Required</span>}
            </div>
            <button
              onClick={handleSubmit}
              disabled={isLoading || isValueEmpty}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </span>
              ) : (
                'Submit Answer'
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          {canComplete ? (
            <>
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" aria-hidden="true" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Ready to Complete!</h2>
              <p className="text-gray-600 mb-4">
                Your readiness score of {readinessScore?.toFixed(1)}% meets the 95% threshold.
              </p>
              <button
                onClick={handleComplete}
                disabled={isLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                Complete Assessment
              </button>
            </>
          ) : (
            <>
              <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-3" aria-hidden="true" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Score Below Threshold</h2>
              <p className="text-gray-600 mb-2">
                Current score: {readinessScore?.toFixed(1) ?? '0'}% (95% required)
              </p>
              <p className="text-sm text-gray-500">
                All questions answered, but coverage needs improvement. Review and update your responses.
              </p>
            </>
          )}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={clearError} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

export default QuestionnairePage;
