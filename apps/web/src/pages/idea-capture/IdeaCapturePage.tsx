/**

 * IdeaCapturePage — Free-form idea input → AI analysis → project type confirmation → session creation

 *

 * Flow:

 * 1. User enters business idea (free text)

 * 2. AI analyzes: themes, gaps, strengths, recommended project type

 * 3. User confirms or selects project type

 * 4. Session created → navigate to questionnaire

 */

import { useState, useCallback } from 'react';

import { useNavigate } from 'react-router-dom';

import {
  Lightbulb,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Target,
  TrendingUp,
  ChevronRight,
  Loader2,
} from 'lucide-react';

import {
  submitIdea,
  createSessionFromIdea,
  confirmProjectType,
  listProjectTypes,
} from '../../api/idea-capture';
import type { IdeaCaptureResponse, ProjectTypeRecommendation } from '../../api/idea-capture';

type Step = 'input' | 'analyzing' | 'results' | 'creating-session';

export function IdeaCapturePage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('input');

  const [rawInput, setRawInput] = useState('');

  const [title, setTitle] = useState('');

  const [ideaResponse, setIdeaResponse] = useState<IdeaCaptureResponse | null>(null);

  const [selectedProjectTypeSlug, setSelectedProjectTypeSlug] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const handleSubmitIdea = useCallback(async () => {
    if (rawInput.trim().length < 10) {
      setError('Please describe your idea in at least a few sentences.');

      return;
    }

    setError(null);

    setStep('analyzing');

    const controller = new AbortController();

    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      const response = await submitIdea(rawInput, title || undefined);

      setIdeaResponse(response);

      setSelectedProjectTypeSlug(response.analysis.recommendedProjectType.slug);

      setStep('results');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Analysis timed out. Please try again with a shorter description.');
      } else if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Network error — please check your connection and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to analyze idea. Please try again.');
      }

      setStep('input');
    } finally {
      clearTimeout(timeout);
    }
  }, [rawInput, title]);

  const handleConfirmAndStart = useCallback(async () => {
    if (!ideaResponse || !selectedProjectTypeSlug) return;

    setStep('creating-session');

    setError(null);

    try {
      // If user picked a different type, confirm it first
      if (selectedProjectTypeSlug !== ideaResponse.analysis.recommendedProjectType.slug) {
        const projectTypes = await listProjectTypes();
        const selectedProjectType = projectTypes.find(
          (projectType) => projectType.slug === selectedProjectTypeSlug,
        );

        if (!selectedProjectType) {
          throw new Error('Selected project type is unavailable. Please try again.');
        }

        await confirmProjectType(ideaResponse.id, selectedProjectType.id);
      }

      const { sessionId } = await createSessionFromIdea(ideaResponse.id);

      navigate(`/questionnaire?sessionId=${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session. Please try again.');

      setStep('results');
    }
  }, [ideaResponse, selectedProjectTypeSlug, navigate]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}

      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-100 text-brand-600 mb-4">
          <Lightbulb className="w-8 h-8" />
        </div>

        <h1 className="text-3xl font-bold text-surface-900 mb-2">Capture Your Idea</h1>

        <p className="text-surface-500 text-lg max-w-2xl mx-auto">
          Describe your business idea in your own words. Our AI will analyze it and recommend the
          best path to turn it into professional documents.
        </p>
      </div>

      {/* Step Indicator */}

      <div className="flex items-center justify-center gap-2 mb-8">
        {(['input', 'analyzing', 'results'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step === s || (step === 'creating-session' && s === 'results')
                  ? 'bg-brand-600 text-white'
                  : i < ['input', 'analyzing', 'results'].indexOf(step)
                    ? 'bg-success-100 text-success-700'
                    : 'bg-surface-200 text-surface-500'
              }`}
            >
              {i < ['input', 'analyzing', 'results'].indexOf(step) ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                i + 1
              )}
            </div>

            {i < 2 && (
              <div
                className={`w-12 h-0.5 ${
                  i < ['input', 'analyzing', 'results'].indexOf(step)
                    ? 'bg-success-400'
                    : 'bg-surface-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error Banner */}

      {error && (
        <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0 mt-0.5" />

          <div>
            <p className="text-sm text-danger-800">{error}</p>

            <button
              onClick={() => setError(null)}
              className="text-sm text-danger-600 underline mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Input */}

      {step === 'input' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-card p-6 border border-surface-200">
            <label htmlFor="idea-title" className="block text-sm font-medium text-surface-700 mb-2">
              Project Title (optional)
            </label>

            <input
              id="idea-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., PetConnect Marketplace"
              className="w-full px-4 py-2.5 rounded-lg border border-surface-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all text-surface-900"
              maxLength={200}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-card p-6 border border-surface-200">
            <label htmlFor="idea-input" className="block text-sm font-medium text-surface-700 mb-2">
              Describe Your Idea
            </label>

            <textarea
              id="idea-input"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="Tell us about your business idea, product, or project. What problem does it solve? Who is it for? How will it make money? The more detail you provide, the better our analysis will be..."
              className="w-full px-4 py-3 rounded-lg border border-surface-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all text-surface-900 min-h-[200px] resize-y"
              maxLength={10000}
            />

            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-surface-400">
                {rawInput.length < 10
                  ? `At least ${10 - rawInput.length} more characters needed`
                  : `${rawInput.length.toLocaleString()} / 10,000 characters`}
              </p>

              <div className="flex items-center gap-1 text-xs text-surface-400">
                <Sparkles className="w-3 h-3" />
                AI-powered analysis
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSubmitIdea}
              disabled={rawInput.trim().length < 10}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-medium rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              Analyze My Idea
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Analyzing */}

      {step === 'analyzing' && (
        <div className="text-center py-16 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-brand-100 mb-6">
            <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
          </div>

          <h2 className="text-xl font-semibold text-surface-900 mb-2">Analyzing Your Idea</h2>

          <p className="text-surface-500 max-w-md mx-auto">
            Our AI is reviewing your idea, identifying themes, and recommending the best project
            type for your goals...
          </p>
        </div>
      )}

      {/* Step 3: Results */}

      {(step === 'results' || step === 'creating-session') && ideaResponse && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary */}

          <div className="bg-white rounded-2xl shadow-card p-6 border border-surface-200">
            <h2 className="text-lg font-semibold text-surface-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-600" />
              Analysis Summary
            </h2>

            <p className="text-surface-600 leading-relaxed">{ideaResponse.analysis.summary}</p>
          </div>

          {/* Themes + Strengths + Gaps */}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow-card p-5 border border-surface-200">
              <h3 className="text-sm font-semibold text-surface-700 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-brand-500" />
                Key Themes
              </h3>

              <div className="flex flex-wrap gap-2">
                {ideaResponse.analysis.themes.map((theme) => (
                  <span
                    key={theme}
                    className="inline-block px-2.5 py-1 bg-brand-50 text-brand-700 text-xs font-medium rounded-full"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-card p-5 border border-surface-200">
              <h3 className="text-sm font-semibold text-surface-700 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success-500" />
                Strengths
              </h3>

              <ul className="space-y-1.5">
                {ideaResponse.analysis.strengths.map((s) => (
                  <li key={s} className="text-xs text-surface-600 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success-500 flex-shrink-0 mt-0.5" />

                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow-card p-5 border border-surface-200">
              <h3 className="text-sm font-semibold text-surface-700 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-warning-500" />
                Areas to Explore
              </h3>

              <ul className="space-y-1.5">
                {ideaResponse.analysis.gaps.map((g) => (
                  <li key={g} className="text-xs text-surface-600 flex items-start gap-1.5">
                    <ChevronRight className="w-3.5 h-3.5 text-warning-500 flex-shrink-0 mt-0.5" />

                    {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Project Type Selection */}

          <div className="bg-white rounded-2xl shadow-card p-6 border border-surface-200">
            <h2 className="text-lg font-semibold text-surface-900 mb-4">
              Recommended Project Type
            </h2>

            <div className="space-y-3">
              {[
                ideaResponse.analysis.recommendedProjectType,

                ...(ideaResponse.analysis.alternativeProjectTypes || []),
              ].map((pt) => (
                <ProjectTypeCard
                  key={pt.slug}
                  projectType={pt}
                  isSelected={selectedProjectTypeSlug === pt.slug}
                  isRecommended={pt.slug === ideaResponse.analysis.recommendedProjectType.slug}
                  onSelect={() => setSelectedProjectTypeSlug(pt.slug)}
                />
              ))}
            </div>
          </div>

          {/* Confirm Button */}

          <div className="flex justify-end">
            <button
              onClick={handleConfirmAndStart}
              disabled={!selectedProjectTypeSlug || step === 'creating-session'}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-medium rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {step === 'creating-session' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Session...
                </>
              ) : (
                <>
                  Start Questionnaire
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectTypeCard({
  projectType,

  isSelected,

  isRecommended,

  onSelect,
}: {
  projectType: ProjectTypeRecommendation;

  isSelected: boolean;

  isRecommended: boolean;

  onSelect: () => void;
}) {
  const confidencePercent = Math.round(projectType.confidence * 100);

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        isSelected
          ? 'border-brand-500 bg-brand-50 shadow-sm'
          : 'border-surface-200 hover:border-surface-300 bg-white'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-surface-900">{projectType.name}</span>

            {isRecommended && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-100 text-brand-700 text-xs font-medium rounded-full">
                <Sparkles className="w-3 h-3" />
                Recommended
              </span>
            )}

            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                confidencePercent >= 70
                  ? 'bg-success-100 text-success-700'
                  : confidencePercent >= 40
                    ? 'bg-warning-100 text-warning-700'
                    : 'bg-surface-100 text-surface-600'
              }`}
            >
              {confidencePercent}% match
            </span>
          </div>

          <p className="text-sm text-surface-500">{projectType.reasoning}</p>
        </div>

        <div
          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ml-3 mt-1 transition-colors ${
            isSelected ? 'border-brand-500 bg-brand-500' : 'border-surface-300'
          }`}
        >
          {isSelected && <CheckCircle2 className="w-full h-full text-white" />}
        </div>
      </div>
    </button>
  );
}
