/**
 * Data Models & DB Architecture Document Template
 * Category: CTO
 *
 * This template defines the structure for generating Data Models & Database Architecture
 * documents from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface DataModelsData {
  organization: {
    name: string;
    project: string;
  };
  conceptualModel: {
    entityRelationships: EntityRelationship[];
    domainModel: string;
  };
  logicalModel: {
    tables: TableDefinition[];
    columns: string;
    relationships: RelationshipDefinition[];
    constraints: ConstraintDefinition[];
  };
  physicalModel: {
    indexes: IndexDefinition[];
    partitioning: string;
    storage: StorageConfig;
  };
  dataFlow: {
    etl: EtlPipeline[];
    migrations: string;
    sync: string;
  };
  dataGovernance: {
    quality: DataQualityRule[];
    retention: RetentionPolicy;
    compliance: string[];
  };
  performance: {
    queryOptimization: string[];
    cachingStrategy: string;
  };
}

interface EntityRelationship {
  entity: string;
  relatedEntity: string;
  type: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY';
  description: string;
}

interface TableDefinition {
  name: string;
  description: string;
  primaryKey: string;
  estimatedRows: string;
}

interface RelationshipDefinition {
  fromTable: string;
  toTable: string;
  type: string;
  foreignKey: string;
  onDelete: string;
}

interface ConstraintDefinition {
  table: string;
  name: string;
  type: 'UNIQUE' | 'CHECK' | 'NOT_NULL' | 'FOREIGN_KEY';
  definition: string;
}

interface IndexDefinition {
  table: string;
  name: string;
  columns: string[];
  type: 'BTREE' | 'HASH' | 'GIN' | 'GIST';
  unique: boolean;
}

interface StorageConfig {
  engine: string;
  tablespace: string;
  estimatedSize: string;
  growthRate: string;
}

interface EtlPipeline {
  name: string;
  source: string;
  destination: string;
  schedule: string;
  transformations: string[];
}

interface DataQualityRule {
  field: string;
  rule: string;
  action: string;
}

interface RetentionPolicy {
  defaultPeriod: string;
  archiveStrategy: string;
  deletionPolicy: string;
}

/**
 * Template configuration for Data Models & DB Architecture
 */
export const DATA_MODELS_TEMPLATE = {
  slug: 'data-models',
  name: 'Data Models & DB Architecture',
  category: DocumentCategory.CTO,
  description:
    'Database architecture document covering conceptual, logical, and physical data models with governance and performance guidelines',
  estimatedPages: 15,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'organization.name',
    'conceptualModel.entityRelationships',
    'logicalModel.tables',
    'logicalModel.relationships',
    'physicalModel.indexes',
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
      contentPath: 'overview',
    },
    {
      id: 'conceptual_model',
      title: 'Conceptual Model',
      required: true,
      subsections: [
        {
          id: 'entity_relationships',
          title: 'Entity Relationships',
          contentPath: 'conceptualModel.entityRelationships',
        },
        {
          id: 'domain_model',
          title: 'Domain Model',
          contentPath: 'conceptualModel.domainModel',
        },
      ],
    },
    {
      id: 'logical_model',
      title: 'Logical Model',
      required: true,
      subsections: [
        {
          id: 'tables',
          title: 'Tables & Entities',
          contentPath: 'logicalModel.tables',
        },
        {
          id: 'columns',
          title: 'Column Definitions',
          contentPath: 'logicalModel.columns',
        },
        {
          id: 'relationships',
          title: 'Relationships & Foreign Keys',
          contentPath: 'logicalModel.relationships',
        },
        {
          id: 'constraints',
          title: 'Constraints',
          contentPath: 'logicalModel.constraints',
        },
      ],
    },
    {
      id: 'physical_model',
      title: 'Physical Model',
      required: true,
      subsections: [
        {
          id: 'indexes',
          title: 'Indexes',
          contentPath: 'physicalModel.indexes',
        },
        {
          id: 'partitioning',
          title: 'Partitioning Strategy',
          contentPath: 'physicalModel.partitioning',
        },
        {
          id: 'storage',
          title: 'Storage Configuration',
          contentPath: 'physicalModel.storage',
        },
      ],
    },
    {
      id: 'data_flow',
      title: 'Data Flow',
      required: true,
      subsections: [
        {
          id: 'etl',
          title: 'ETL Pipelines',
          contentPath: 'dataFlow.etl',
        },
        {
          id: 'migrations',
          title: 'Migration Strategy',
          contentPath: 'dataFlow.migrations',
        },
        {
          id: 'sync',
          title: 'Data Synchronization',
          contentPath: 'dataFlow.sync',
        },
      ],
    },
    {
      id: 'data_governance',
      title: 'Data Governance',
      required: true,
      subsections: [
        {
          id: 'quality',
          title: 'Data Quality Rules',
          contentPath: 'dataGovernance.quality',
        },
        {
          id: 'retention',
          title: 'Retention Policies',
          contentPath: 'dataGovernance.retention',
        },
        {
          id: 'compliance',
          title: 'Compliance Requirements',
          contentPath: 'dataGovernance.compliance',
        },
      ],
    },
    {
      id: 'performance',
      title: 'Performance',
      required: true,
      subsections: [
        {
          id: 'query_optimization',
          title: 'Query Optimization',
          contentPath: 'performance.queryOptimization',
        },
        {
          id: 'caching_strategy',
          title: 'Caching Strategy',
          contentPath: 'performance.cachingStrategy',
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
    'project-name': 'organization.project',
    'entity-relationships': 'conceptualModel.entityRelationships',
    'domain-model': 'conceptualModel.domainModel',
    'database-tables': 'logicalModel.tables',
    'column-definitions': 'logicalModel.columns',
    'table-relationships': 'logicalModel.relationships',
    'database-constraints': 'logicalModel.constraints',
    'database-indexes': 'physicalModel.indexes',
    'partitioning-strategy': 'physicalModel.partitioning',
    'storage-configuration': 'physicalModel.storage',
    'etl-pipelines': 'dataFlow.etl',
    'migration-strategy': 'dataFlow.migrations',
    'data-sync-strategy': 'dataFlow.sync',
    'data-quality-rules': 'dataGovernance.quality',
    'data-retention-policy': 'dataGovernance.retention',
    'data-compliance-requirements': 'dataGovernance.compliance',
    'query-optimization': 'performance.queryOptimization',
    'db-caching-strategy': 'performance.cachingStrategy',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'physicalModel.partitioning': 'Partitioning strategy to be determined based on data volume analysis',
    'dataFlow.sync': 'Data synchronization requirements under review',
    'performance.cachingStrategy': 'Application-level caching with Redis for frequently accessed queries',
  },
};
