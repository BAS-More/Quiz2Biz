/**
 * IP Assignment/NDA Document Template
 * Category: CTO
 *
 * This template defines the structure for generating IP Assignment/NDA documents
 * from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface IpAssignmentNdaData {
  organization: {
    name: string;
    industry: string;
    jurisdiction: string;
  };
  overview: {
    purpose: string;
    scope: string;
    effectiveDate: string;
    parties: ContractParty[];
  };
  ipAssignment: {
    scope: string;
    inventions: InventionClause;
    worksForHire: WorksForHireClause;
    moralRights: string;
  };
  confidentiality: {
    definition: string;
    obligations: string[];
    exclusions: string[];
    duration: string;
  };
  nonDisclosure: {
    protectedInformation: ProtectedCategory[];
    permittedDisclosures: string[];
    returnOfMaterials: string;
  };
  nonCompete: {
    scope: string;
    duration: string;
    geographicLimitations: string;
    exceptions: string[];
  };
  enforcement: {
    remedies: string[];
    injunctiveRelief: string;
    attorneyFees: string;
  };
  generalProvisions: {
    governingLaw: string;
    severability: string;
    amendments: string;
    entireAgreement: string;
    waiver: string;
    notices: string;
  };
}

interface ContractParty {
  name: string;
  role: 'DISCLOSER' | 'RECIPIENT' | 'BOTH';
  address: string;
  representative: string;
}

interface InventionClause {
  priorInventions: string;
  assignedInventions: string;
  disclosureRequirements: string;
  compensationTerms: string;
}

interface WorksForHireClause {
  definition: string;
  scope: string;
  ownership: string;
  exceptions: string[];
}

interface ProtectedCategory {
  category: string;
  description: string;
  examples: string[];
  protectionLevel: 'HIGHLY_CONFIDENTIAL' | 'CONFIDENTIAL' | 'INTERNAL';
}

/**
 * Template configuration for IP Assignment/NDA
 */
export const IP_ASSIGNMENT_NDA_TEMPLATE = {
  slug: 'ip-assignment-nda',
  name: 'IP Assignment/NDA',
  category: DocumentCategory.CTO,
  description:
    'Comprehensive IP assignment and non-disclosure agreement covering intellectual property rights, confidentiality obligations, non-compete provisions, and enforcement mechanisms',
  estimatedPages: 8,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'organization.name',
    'overview.parties',
    'ipAssignment.scope',
    'confidentiality.definition',
    'confidentiality.obligations',
    'nonDisclosure.protectedInformation',
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
      contentPath: 'overview.purpose',
    },
    {
      id: 'ip_assignment',
      title: 'IP Assignment',
      required: true,
      subsections: [
        {
          id: 'ip_scope',
          title: 'Scope of Assignment',
          contentPath: 'ipAssignment.scope',
        },
        {
          id: 'inventions',
          title: 'Inventions',
          contentPath: 'ipAssignment.inventions',
        },
        {
          id: 'works_for_hire',
          title: 'Works for Hire',
          contentPath: 'ipAssignment.worksForHire',
        },
        {
          id: 'moral_rights',
          title: 'Moral Rights',
          contentPath: 'ipAssignment.moralRights',
        },
      ],
    },
    {
      id: 'confidentiality',
      title: 'Confidentiality',
      required: true,
      subsections: [
        {
          id: 'definition',
          title: 'Definition of Confidential Information',
          contentPath: 'confidentiality.definition',
        },
        {
          id: 'obligations',
          title: 'Confidentiality Obligations',
          contentPath: 'confidentiality.obligations',
        },
        {
          id: 'exclusions',
          title: 'Exclusions',
          contentPath: 'confidentiality.exclusions',
        },
        {
          id: 'duration',
          title: 'Duration of Obligations',
          contentPath: 'confidentiality.duration',
        },
      ],
    },
    {
      id: 'non_disclosure',
      title: 'Non-Disclosure',
      required: true,
      subsections: [
        {
          id: 'protected_information',
          title: 'Protected Information',
          contentPath: 'nonDisclosure.protectedInformation',
        },
        {
          id: 'permitted_disclosures',
          title: 'Permitted Disclosures',
          contentPath: 'nonDisclosure.permittedDisclosures',
        },
        {
          id: 'return_of_materials',
          title: 'Return of Materials',
          contentPath: 'nonDisclosure.returnOfMaterials',
        },
      ],
    },
    {
      id: 'non_compete',
      title: 'Non-Compete',
      required: false,
      subsections: [
        {
          id: 'non_compete_scope',
          title: 'Scope',
          contentPath: 'nonCompete.scope',
        },
        {
          id: 'non_compete_duration',
          title: 'Duration',
          contentPath: 'nonCompete.duration',
        },
        {
          id: 'geographic_limitations',
          title: 'Geographic Limitations',
          contentPath: 'nonCompete.geographicLimitations',
        },
      ],
    },
    {
      id: 'enforcement',
      title: 'Enforcement',
      required: true,
      subsections: [
        {
          id: 'remedies',
          title: 'Remedies',
          contentPath: 'enforcement.remedies',
        },
        {
          id: 'injunctive_relief',
          title: 'Injunctive Relief',
          contentPath: 'enforcement.injunctiveRelief',
        },
        {
          id: 'attorney_fees',
          title: 'Attorney Fees',
          contentPath: 'enforcement.attorneyFees',
        },
      ],
    },
    {
      id: 'general_provisions',
      title: 'General Provisions',
      required: true,
      subsections: [
        {
          id: 'governing_law',
          title: 'Governing Law',
          contentPath: 'generalProvisions.governingLaw',
        },
        {
          id: 'severability',
          title: 'Severability',
          contentPath: 'generalProvisions.severability',
        },
        {
          id: 'amendments',
          title: 'Amendments',
          contentPath: 'generalProvisions.amendments',
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
    'organization-industry': 'organization.industry',
    'jurisdiction': 'organization.jurisdiction',
    'agreement-purpose': 'overview.purpose',
    'agreement-scope': 'overview.scope',
    'effective-date': 'overview.effectiveDate',
    'contract-parties': 'overview.parties',
    'ip-assignment-scope': 'ipAssignment.scope',
    'inventions-clause': 'ipAssignment.inventions',
    'works-for-hire': 'ipAssignment.worksForHire',
    'moral-rights': 'ipAssignment.moralRights',
    'confidential-info-definition': 'confidentiality.definition',
    'confidentiality-obligations': 'confidentiality.obligations',
    'confidentiality-exclusions': 'confidentiality.exclusions',
    'confidentiality-duration': 'confidentiality.duration',
    'protected-information': 'nonDisclosure.protectedInformation',
    'permitted-disclosures': 'nonDisclosure.permittedDisclosures',
    'return-of-materials': 'nonDisclosure.returnOfMaterials',
    'non-compete-scope': 'nonCompete.scope',
    'non-compete-duration': 'nonCompete.duration',
    'geographic-limitations': 'nonCompete.geographicLimitations',
    'non-compete-exceptions': 'nonCompete.exceptions',
    'enforcement-remedies': 'enforcement.remedies',
    'injunctive-relief': 'enforcement.injunctiveRelief',
    'attorney-fees': 'enforcement.attorneyFees',
    'governing-law': 'generalProvisions.governingLaw',
    'severability': 'generalProvisions.severability',
    'amendments': 'generalProvisions.amendments',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'confidentiality.duration': 'Obligations survive for a period of 3 years following termination of the agreement',
    'confidentiality.exclusions': ['Information that is or becomes publicly available through no fault of the receiving party', 'Information independently developed by the receiving party', 'Information lawfully obtained from a third party without restriction'],
    'nonDisclosure.returnOfMaterials': 'All confidential materials must be returned or destroyed within 30 days of agreement termination',
    'enforcement.injunctiveRelief': 'The parties acknowledge that breach may cause irreparable harm and that injunctive relief may be sought without bond',
    'enforcement.attorneyFees': 'The prevailing party shall be entitled to recover reasonable attorney fees and costs',
    'generalProvisions.severability': 'If any provision is found unenforceable, the remaining provisions shall continue in full force and effect',
    'generalProvisions.amendments': 'This agreement may only be amended by written instrument signed by both parties',
  },
};
