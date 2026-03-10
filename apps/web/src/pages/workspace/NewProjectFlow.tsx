/**
 * New Project Flow
 * Simple wizard for starting a new project with type selection
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import projectApi from '../../api/projects';
import type { CreateProjectRequest } from '../../api/projects';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Rocket,
  TrendingUp,
  Laptop,
  FileText,
  Target,
  Zap,
  Loader,
} from 'lucide-react';
import { Card } from '../../components/ui';
import { clsx } from 'clsx';

/** Project types with descriptions */
const PROJECT_TYPES = [
  {
    slug: 'business-plan',
    name: 'Business Plan',
    description: 'Comprehensive plan for starting or growing a business',
    icon: Briefcase,
    color: 'brand',
  },
  {
    slug: 'tech-assessment',
    name: 'Tech Assessment',
    description: 'Evaluate technology needs and implementation roadmap',
    icon: Laptop,
    color: 'accent',
  },
  {
    slug: 'marketing-strategy',
    name: 'Marketing Strategy',
    description: 'Define your marketing approach and campaigns',
    icon: TrendingUp,
    color: 'success',
  },
  {
    slug: 'investment-pitch',
    name: 'Investment Pitch',
    description: 'Prepare materials for investor presentations',
    icon: Rocket,
    color: 'warning',
  },
  {
    slug: 'operations-manual',
    name: 'Operations Manual',
    description: 'Document processes and standard procedures',
    icon: FileText,
    color: 'surface',
  },
  {
    slug: 'grant-application',
    name: 'Grant Application',
    description: 'Prepare grant proposals and funding requests',
    icon: Target,
    color: 'danger',
  },
  {
    slug: 'product-roadmap',
    name: 'Product Roadmap',
    description: 'Plan product development and feature releases',
    icon: Zap,
    color: 'brand',
  },
];

const colorClasses: Record<string, string> = {
  brand: 'bg-brand-50 text-brand-600 border-brand-200 hover:border-brand-400',
  accent: 'bg-accent-50 text-accent-600 border-accent-200 hover:border-accent-400',
  success: 'bg-success-50 text-success-600 border-success-200 hover:border-success-400',
  warning: 'bg-warning-50 text-warning-600 border-warning-200 hover:border-warning-400',
  surface: 'bg-surface-50 text-surface-600 border-surface-200 hover:border-surface-400',
  danger: 'bg-danger-50 text-danger-600 border-danger-200 hover:border-danger-400',
};

const selectedColorClasses: Record<string, string> = {
  brand: 'bg-brand-100 border-brand-500 ring-2 ring-brand-500/20',
  accent: 'bg-accent-100 border-accent-500 ring-2 ring-accent-500/20',
  success: 'bg-success-100 border-success-500 ring-2 ring-success-500/20',
  warning: 'bg-warning-100 border-warning-500 ring-2 ring-warning-500/20',
  surface: 'bg-surface-100 border-surface-500 ring-2 ring-surface-500/20',
  danger: 'bg-danger-100 border-danger-500 ring-2 ring-danger-500/20',
};

export function NewProjectFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTypeInfo = PROJECT_TYPES.find((t) => t.slug === selectedType);

  const handleCreate = async () => {
    if (!selectedType || !projectName.trim()) {
      setError('Please enter a project name');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const request: CreateProjectRequest = {
        name: projectName.trim(),
        description: description.trim() || undefined,
        projectTypeSlug: selectedType,
      };
      const project = await projectApi.createProject(request);
      navigate(`/chat/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => (step === 1 ? navigate(-1) : setStep(1))}
          className="p-2 rounded-lg hover:bg-surface-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-surface-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-surface-900">New Project</h1>
          <p className="text-sm text-surface-500">
            Step {step} of 2: {step === 1 ? 'Choose project type' : 'Name your project'}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-8">
        <div
          className={clsx(
            'flex-1 h-1 rounded-full transition-colors',
            step >= 1 ? 'bg-brand-500' : 'bg-surface-200',
          )}
        />
        <div
          className={clsx(
            'flex-1 h-1 rounded-full transition-colors',
            step >= 2 ? 'bg-brand-500' : 'bg-surface-200',
          )}
        />
      </div>

      {/* Step 1: Select type */}
      {step === 1 && (
        <div className="space-y-6">
          <p className="text-sm text-surface-600">
            What kind of project are you working on? This helps us tailor the conversation and
            documents to your needs.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PROJECT_TYPES.map((type) => (
              <button
                key={type.slug}
                onClick={() => setSelectedType(type.slug)}
                className={clsx(
                  'flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all',
                  selectedType === type.slug
                    ? selectedColorClasses[type.color]
                    : colorClasses[type.color],
                )}
              >
                <div
                  className={clsx(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    selectedType === type.slug ? 'bg-white/80' : 'bg-white',
                  )}
                >
                  <type.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-surface-900">{type.name}</h3>
                  <p className="text-xs text-surface-500 mt-0.5">{type.description}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => selectedType && setStep(2)}
              disabled={!selectedType}
              className={clsx(
                'inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors',
                selectedType
                  ? 'bg-brand-600 text-white hover:bg-brand-700'
                  : 'bg-surface-100 text-surface-400 cursor-not-allowed',
              )}
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Name project */}
      {step === 2 && selectedTypeInfo && (
        <div className="space-y-6">
          {/* Selected type summary */}
          <Card className="bg-surface-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-xs">
                <selectedTypeInfo.icon className="h-5 w-5 text-brand-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-900">{selectedTypeInfo.name}</p>
                <p className="text-xs text-surface-500">{selectedTypeInfo.description}</p>
              </div>
            </div>
          </Card>

          {/* Project name input */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">
              Project Name *
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={`My ${selectedTypeInfo.name}`}
              className="w-full px-4 py-3 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Description input */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your project..."
              rows={3}
              className="w-full px-4 py-3 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-surface-600 hover:bg-surface-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating || !projectName.trim()}
              className={clsx(
                'inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isCreating || !projectName.trim()
                  ? 'bg-surface-100 text-surface-400 cursor-not-allowed'
                  : 'bg-brand-600 text-white hover:bg-brand-700',
              )}
            >
              {isCreating ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Start Project
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
