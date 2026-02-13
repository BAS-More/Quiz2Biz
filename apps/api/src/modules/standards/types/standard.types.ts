import { StandardCategory } from '@prisma/client';

export interface Principle {
  title: string;
  description: string;
  examples?: string[];
}

export interface StandardResponse {
  id: string;
  category: StandardCategory;
  title: string;
  description: string;
  principles: Principle[];
  version: string;
  isActive: boolean;
}

export interface StandardWithMappings extends StandardResponse {
  documentTypes: {
    id: string;
    name: string;
    slug: string;
    sectionTitle?: string;
    priority: number;
  }[];
}

export interface DocumentStandardMapping {
  documentTypeId: string;
  documentTypeName: string;
  documentTypeSlug: string;
  standards: {
    id: string;
    category: StandardCategory;
    title: string;
    sectionTitle?: string;
    priority: number;
  }[];
}

export interface GeneratedStandardsSection {
  markdown: string;
  standards: {
    category: StandardCategory;
    title: string;
    principles: Principle[];
  }[];
}

export const STANDARD_CATEGORY_TITLES: Record<StandardCategory, string> = {
  MODERN_ARCHITECTURE: 'Modern Architecture & Design',
  AI_ASSISTED_DEV: 'AI-Assisted Development',
  CODING_STANDARDS: 'Coding Standards & Principles',
  TESTING_QA: 'Testing & Quality Assurance',
  SECURITY_DEVSECOPS: 'Security (DevSecOps)',
  WORKFLOW_OPS: 'Workflow & Operations',
  DOCS_KNOWLEDGE: 'Documentation & Knowledge',
};
