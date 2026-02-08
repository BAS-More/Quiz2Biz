/**
 * API Documentation Template
 * Category: CTO
 *
 * This template defines the structure for generating API Documentation documents
 * from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface ApiDocumentationData {
  overview: {
    purpose: string;
    baseUrl: string;
    versioning: string;
  };
  authentication: {
    methods: AuthMethod[];
    tokens: TokenConfig;
    rateLimiting: RateLimitConfig;
  };
  endpoints: {
    resources: ApiResource[];
  };
  dataModels: {
    schemas: DataSchema[];
    relationships: string[];
    validation: string;
  };
  webhooks: {
    events: WebhookEvent[];
    payloads: string;
    retryPolicy: string;
  };
  sdkLibraries: {
    available: SdkLibrary[];
    gettingStarted: string;
  };
  errorHandling: {
    codes: ErrorCode[];
    messages: string;
    debugging: string;
  };
}

interface AuthMethod {
  type: 'API_KEY' | 'OAUTH2' | 'JWT' | 'BASIC' | 'BEARER';
  description: string;
  configuration: string;
}

interface TokenConfig {
  type: string;
  expiration: string;
  refresh: string;
}

interface RateLimitConfig {
  requestsPerMinute: number;
  burstLimit: number;
  headers: string[];
}

interface ApiResource {
  name: string;
  basePath: string;
  operations: ApiOperation[];
}

interface ApiOperation {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  parameters: string[];
  requestBody: string;
  responses: string[];
}

interface DataSchema {
  name: string;
  description: string;
  fields: SchemaField[];
}

interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface WebhookEvent {
  name: string;
  trigger: string;
  payload: string;
}

interface SdkLibrary {
  language: string;
  repository: string;
  version: string;
}

interface ErrorCode {
  code: number;
  name: string;
  description: string;
  resolution: string;
}

/**
 * Template configuration for API Documentation
 */
export const API_DOCUMENTATION_TEMPLATE = {
  slug: 'api-documentation',
  name: 'API Documentation',
  category: DocumentCategory.CTO,
  description:
    'Comprehensive API reference documentation covering endpoints, authentication, data models, and error handling',
  estimatedPages: 18,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'overview.purpose',
    'overview.baseUrl',
    'authentication.methods',
    'endpoints.resources',
    'dataModels.schemas',
  ],

  /**
   * Section order for document generation
   */
  sections: [
    {
      id: 'document_control',
      title: 'Document Control',
      required: true,
    },
    {
      id: 'overview',
      title: 'Overview',
      required: true,
      subsections: [
        {
          id: 'purpose',
          title: 'Purpose',
          contentPath: 'overview.purpose',
        },
        {
          id: 'base_url',
          title: 'Base URL',
          contentPath: 'overview.baseUrl',
        },
        {
          id: 'versioning',
          title: 'Versioning',
          contentPath: 'overview.versioning',
        },
      ],
    },
    {
      id: 'authentication',
      title: 'Authentication',
      required: true,
      subsections: [
        {
          id: 'auth_methods',
          title: 'Authentication Methods',
          contentPath: 'authentication.methods',
        },
        {
          id: 'tokens',
          title: 'Tokens & Sessions',
          contentPath: 'authentication.tokens',
        },
        {
          id: 'rate_limiting',
          title: 'Rate Limiting',
          contentPath: 'authentication.rateLimiting',
        },
      ],
    },
    {
      id: 'endpoints',
      title: 'Endpoints',
      required: true,
      subsections: [
        {
          id: 'resources',
          title: 'API Resources & Operations',
          contentPath: 'endpoints.resources',
        },
      ],
    },
    {
      id: 'data_models',
      title: 'Data Models',
      required: true,
      subsections: [
        {
          id: 'schemas',
          title: 'Schemas',
          contentPath: 'dataModels.schemas',
        },
        {
          id: 'relationships',
          title: 'Relationships',
          contentPath: 'dataModels.relationships',
        },
        {
          id: 'validation',
          title: 'Validation Rules',
          contentPath: 'dataModels.validation',
        },
      ],
    },
    {
      id: 'webhooks',
      title: 'Webhooks',
      required: false,
      subsections: [
        {
          id: 'events',
          title: 'Webhook Events',
          contentPath: 'webhooks.events',
        },
        {
          id: 'payloads',
          title: 'Payloads',
          contentPath: 'webhooks.payloads',
        },
        {
          id: 'retry_policy',
          title: 'Retry Policy',
          contentPath: 'webhooks.retryPolicy',
        },
      ],
    },
    {
      id: 'sdk_libraries',
      title: 'SDK & Client Libraries',
      required: false,
      subsections: [
        {
          id: 'available_sdks',
          title: 'Available SDKs',
          contentPath: 'sdkLibraries.available',
        },
        {
          id: 'getting_started',
          title: 'Getting Started',
          contentPath: 'sdkLibraries.gettingStarted',
        },
      ],
    },
    {
      id: 'error_handling',
      title: 'Error Handling',
      required: true,
      subsections: [
        {
          id: 'error_codes',
          title: 'Error Codes',
          contentPath: 'errorHandling.codes',
        },
        {
          id: 'error_messages',
          title: 'Error Messages',
          contentPath: 'errorHandling.messages',
        },
        {
          id: 'debugging',
          title: 'Debugging Guide',
          contentPath: 'errorHandling.debugging',
        },
      ],
    },
    {
      id: 'appendices',
      title: 'Appendices',
      required: false,
    },
  ],

  /**
   * Question to content field mappings (question slug -> content path)
   */
  questionMappings: {
    'api-purpose': 'overview.purpose',
    'api-base-url': 'overview.baseUrl',
    'api-versioning-strategy': 'overview.versioning',
    'authentication-methods': 'authentication.methods',
    'token-configuration': 'authentication.tokens',
    'rate-limiting-policy': 'authentication.rateLimiting',
    'api-resources': 'endpoints.resources',
    'data-schemas': 'dataModels.schemas',
    'model-relationships': 'dataModels.relationships',
    'validation-rules': 'dataModels.validation',
    'webhook-events': 'webhooks.events',
    'webhook-payloads': 'webhooks.payloads',
    'webhook-retry-policy': 'webhooks.retryPolicy',
    'available-sdks': 'sdkLibraries.available',
    'sdk-getting-started': 'sdkLibraries.gettingStarted',
    'error-codes': 'errorHandling.codes',
    'error-message-format': 'errorHandling.messages',
    'debugging-guide': 'errorHandling.debugging',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'overview.versioning': 'URI-based versioning (e.g., /v1/, /v2/)',
    'webhooks.retryPolicy': 'Exponential backoff with 3 retry attempts over 24 hours',
    'sdkLibraries.gettingStarted': 'SDK documentation to be published',
    'errorHandling.debugging': 'Enable debug mode by setting X-Debug-Mode header to true',
  },
};
