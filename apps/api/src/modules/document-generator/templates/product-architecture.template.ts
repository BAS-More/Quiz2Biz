/**
 * Product Architecture Document Template
 * Category: CTO
 *
 * This template defines the structure for generating Product Architecture documents
 * from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface ProductArchitectureData {
  organization: {
    name: string;
    product: string;
  };
  systemOverview: {
    highLevelArchitecture: string;
    designPrinciples: string[];
    constraints: string[];
  };
  componentDesign: {
    frontend: ComponentSpec;
    backend: ComponentSpec;
    database: DatabaseSpec;
    integration: IntegrationSpec[];
  };
  infrastructure: {
    hosting: HostingConfig;
    networking: string;
    scaling: ScalingStrategy;
    monitoring: MonitoringConfig;
  };
  securityArchitecture: {
    authentication: string;
    authorization: string;
    dataProtection: string;
    threatModel: ThreatModelEntry[];
  };
  performance: {
    benchmarks: PerformanceBenchmark[];
    optimization: string[];
    caching: string;
  };
  deployment: {
    cicd: string;
    environments: DeploymentEnvironment[];
    rollback: string;
  };
}

interface ComponentSpec {
  technology: string;
  framework: string;
  patterns: string[];
  responsibilities: string[];
}

interface DatabaseSpec {
  type: string;
  engine: string;
  schema: string;
  replication: string;
}

interface IntegrationSpec {
  name: string;
  type: 'REST' | 'GraphQL' | 'gRPC' | 'WebSocket' | 'Message Queue';
  protocol: string;
  description: string;
}

interface HostingConfig {
  provider: string;
  region: string;
  services: string[];
}

interface ScalingStrategy {
  type: 'HORIZONTAL' | 'VERTICAL' | 'AUTO';
  triggers: string[];
  limits: string;
}

interface MonitoringConfig {
  tools: string[];
  metrics: string[];
  alerting: string;
}

interface ThreatModelEntry {
  threat: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  mitigation: string;
}

interface PerformanceBenchmark {
  metric: string;
  target: string;
  current: string;
}

interface DeploymentEnvironment {
  name: string;
  purpose: string;
  configuration: string;
}

/**
 * Template configuration for Product Architecture
 */
export const PRODUCT_ARCHITECTURE_TEMPLATE = {
  slug: 'product-architecture',
  name: 'Product Architecture',
  category: DocumentCategory.CTO,
  description:
    'Comprehensive product architecture document covering system design, components, infrastructure, security, and deployment',
  estimatedPages: 20,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'organization.name',
    'organization.product',
    'systemOverview.highLevelArchitecture',
    'componentDesign.frontend',
    'componentDesign.backend',
    'infrastructure.hosting',
    'securityArchitecture.authentication',
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
      id: 'executive_summary',
      title: 'Executive Summary',
      required: true,
      contentPath: 'executive_summary',
    },
    {
      id: 'system_overview',
      title: 'System Overview',
      required: true,
      subsections: [
        {
          id: 'high_level_architecture',
          title: 'High-Level Architecture',
          contentPath: 'systemOverview.highLevelArchitecture',
        },
        {
          id: 'design_principles',
          title: 'Design Principles',
          contentPath: 'systemOverview.designPrinciples',
        },
        {
          id: 'constraints',
          title: 'Constraints & Assumptions',
          contentPath: 'systemOverview.constraints',
        },
      ],
    },
    {
      id: 'component_design',
      title: 'Component Design',
      required: true,
      subsections: [
        {
          id: 'frontend',
          title: 'Frontend Architecture',
          contentPath: 'componentDesign.frontend',
        },
        {
          id: 'backend',
          title: 'Backend Architecture',
          contentPath: 'componentDesign.backend',
        },
        {
          id: 'database',
          title: 'Database Architecture',
          contentPath: 'componentDesign.database',
        },
        {
          id: 'integration',
          title: 'Integration Layer',
          contentPath: 'componentDesign.integration',
        },
      ],
    },
    {
      id: 'infrastructure',
      title: 'Infrastructure',
      required: true,
      subsections: [
        {
          id: 'hosting',
          title: 'Hosting & Cloud Services',
          contentPath: 'infrastructure.hosting',
        },
        {
          id: 'networking',
          title: 'Networking',
          contentPath: 'infrastructure.networking',
        },
        {
          id: 'scaling',
          title: 'Scaling Strategy',
          contentPath: 'infrastructure.scaling',
        },
        {
          id: 'monitoring',
          title: 'Monitoring & Observability',
          contentPath: 'infrastructure.monitoring',
        },
      ],
    },
    {
      id: 'security_architecture',
      title: 'Security Architecture',
      required: true,
      subsections: [
        {
          id: 'authentication',
          title: 'Authentication',
          contentPath: 'securityArchitecture.authentication',
        },
        {
          id: 'authorization',
          title: 'Authorization',
          contentPath: 'securityArchitecture.authorization',
        },
        {
          id: 'data_protection',
          title: 'Data Protection',
          contentPath: 'securityArchitecture.dataProtection',
        },
        {
          id: 'threat_model',
          title: 'Threat Model',
          contentPath: 'securityArchitecture.threatModel',
        },
      ],
    },
    {
      id: 'performance',
      title: 'Performance',
      required: true,
      subsections: [
        {
          id: 'benchmarks',
          title: 'Performance Benchmarks',
          contentPath: 'performance.benchmarks',
        },
        {
          id: 'optimization',
          title: 'Optimization Strategies',
          contentPath: 'performance.optimization',
        },
        {
          id: 'caching',
          title: 'Caching Strategy',
          contentPath: 'performance.caching',
        },
      ],
    },
    {
      id: 'deployment',
      title: 'Deployment',
      required: true,
      subsections: [
        {
          id: 'cicd',
          title: 'CI/CD Pipeline',
          contentPath: 'deployment.cicd',
        },
        {
          id: 'environments',
          title: 'Environments',
          contentPath: 'deployment.environments',
        },
        {
          id: 'rollback',
          title: 'Rollback Strategy',
          contentPath: 'deployment.rollback',
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
    'organization-name': 'organization.name',
    'product-name': 'organization.product',
    'high-level-architecture': 'systemOverview.highLevelArchitecture',
    'design-principles': 'systemOverview.designPrinciples',
    'architecture-constraints': 'systemOverview.constraints',
    'frontend-technology': 'componentDesign.frontend',
    'backend-technology': 'componentDesign.backend',
    'database-technology': 'componentDesign.database',
    'integration-points': 'componentDesign.integration',
    'hosting-provider': 'infrastructure.hosting',
    'network-architecture': 'infrastructure.networking',
    'scaling-strategy': 'infrastructure.scaling',
    'monitoring-tools': 'infrastructure.monitoring',
    'authentication-method': 'securityArchitecture.authentication',
    'authorization-model': 'securityArchitecture.authorization',
    'data-protection-measures': 'securityArchitecture.dataProtection',
    'threat-model': 'securityArchitecture.threatModel',
    'performance-benchmarks': 'performance.benchmarks',
    'optimization-strategies': 'performance.optimization',
    'caching-strategy': 'performance.caching',
    'cicd-pipeline': 'deployment.cicd',
    'deployment-environments': 'deployment.environments',
    'rollback-strategy': 'deployment.rollback',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'infrastructure.networking': 'Standard VPC with private/public subnet configuration',
    'deployment.rollback': 'Blue-green deployment with automated rollback on health check failure',
    'performance.caching': 'Multi-layer caching strategy to be defined',
  },
};
