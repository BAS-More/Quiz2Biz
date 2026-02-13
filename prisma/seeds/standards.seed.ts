import { PrismaClient, StandardCategory, DocumentCategory } from '@prisma/client';

const prisma = new PrismaClient();

interface Principle {
  title: string;
  description: string;
  examples?: string[];
}

interface StandardData {
  category: StandardCategory;
  title: string;
  description: string;
  principles: Principle[];
}

const ENGINEERING_STANDARDS: StandardData[] = [
  {
    category: 'MODERN_ARCHITECTURE',
    title: 'Modern Architecture & Design',
    description:
      'Architectural principles for building scalable, maintainable, and cloud-native systems.',
    principles: [
      {
        title: 'Modular Monoliths & Right-Sized Services',
        description:
          'Favor "right-sized" services determined by business boundaries over extreme microservices to reduce operational complexity.',
        examples: ['Domain-driven design bounded contexts', 'Vertical slice architecture'],
      },
      {
        title: 'Cloud-Native Foundations',
        description:
          'Use Infrastructure as Code (IaC) and containers (e.g., Kubernetes) to ensure reproducible and elastic environments.',
        examples: ['Terraform/Pulumi for IaC', 'Docker containers', 'Kubernetes orchestration'],
      },
      {
        title: 'Modular Design',
        description:
          'Build loosely coupled, independently deployable components with clear API contracts.',
        examples: [
          'OpenAPI/Swagger specifications',
          'Event-driven architecture',
          'Clean architecture layers',
        ],
      },
      {
        title: 'Design Before Coding',
        description:
          'Create system context diagrams, API contracts, and data topologies before starting implementation.',
        examples: ['C4 diagrams', 'ERD diagrams', 'Sequence diagrams'],
      },
    ],
  },
  {
    category: 'AI_ASSISTED_DEV',
    title: 'AI-Assisted Development',
    description:
      'Best practices for integrating AI tools into the development workflow while maintaining quality and security.',
    principles: [
      {
        title: 'AI as a Partner',
        description:
          'Integrate AI-powered coding assistants into IDEs for code completion, refactoring suggestions, and test generation.',
        examples: ['GitHub Copilot', 'Cursor', 'Claude for code review'],
      },
      {
        title: 'Multi-Agent Systems (MAS)',
        description:
          'Utilize networks of specialized AI agents to automate entire workflows, such as one agent for monitoring and another for code review.',
        examples: ['Automated PR reviews', 'Intelligent test generation', 'Documentation agents'],
      },
      {
        title: 'Human-in-the-Loop Validation',
        description:
          'Maintain human review for all AI-generated code to prevent licensing, security, and logic errors.',
        examples: ['Mandatory code reviews', 'License compliance checks', 'Security scanning'],
      },
    ],
  },
  {
    category: 'CODING_STANDARDS',
    title: 'Coding Standards & Principles',
    description: 'Timeless principles and modern practices for writing clean, maintainable code.',
    principles: [
      {
        title: 'KISS (Keep It Simple, Stupid)',
        description: 'Choose the simplest working solution. Avoid unnecessary complexity.',
        examples: ['Prefer composition over inheritance', 'Avoid premature optimization'],
      },
      {
        title: "YAGNI (You Aren't Gonna Need It)",
        description:
          'Implement only currently required features. Do not build for hypothetical future requirements.',
        examples: ['No speculative generalization', 'Feature flags for experiments'],
      },
      {
        title: "DRY (Don't Repeat Yourself)",
        description: 'Abstract repeated logic into shared functions. Eliminate code duplication.',
        examples: ['Shared utility functions', 'Common component libraries'],
      },
      {
        title: 'SOLID Principles',
        description:
          'Follow Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion.',
        examples: [
          'One class, one responsibility',
          'Program to interfaces',
          'Dependency injection',
        ],
      },
      {
        title: 'Style Guide Adherence',
        description: 'Enforce consistent formatting using automated linters and formatters.',
        examples: ['ESLint/Prettier for JavaScript', 'PEP 8 for Python', 'gofmt for Go'],
      },
      {
        title: 'Meaningful Naming',
        description: 'Use descriptive names that reveal intent.',
        examples: ['calculateTotalAmount instead of calc', 'isUserAuthenticated instead of flag'],
      },
    ],
  },
  {
    category: 'TESTING_QA',
    title: 'Testing & Quality Assurance',
    description: 'Comprehensive testing strategies to ensure software quality and reliability.',
    principles: [
      {
        title: 'Shift-Left Testing',
        description: 'Start testing in the earliest stages of development rather than at the end.',
        examples: ['Unit tests during development', 'TDD practices', 'Static analysis in IDE'],
      },
      {
        title: 'Layered Testing Strategy',
        description:
          'Combine unit tests (logic), integration tests (service communication), and end-to-end tests (user flows).',
        examples: ['Testing pyramid', '70/20/10 distribution', 'Contract testing'],
      },
      {
        title: 'Automated Acceptance Tests',
        description:
          'Use Behavior-Driven Development (BDD) with "Given-When-Then" language for clarity between developers and stakeholders.',
        examples: ['Cucumber/Gherkin specs', 'Playwright for E2E', 'Cypress for UI testing'],
      },
      {
        title: 'Chaos Engineering',
        description:
          'Test the resilience of critical production paths in distributed systems by intentionally introducing failures.',
        examples: ['Netflix Chaos Monkey', 'Fault injection', 'Game days'],
      },
    ],
  },
  {
    category: 'SECURITY_DEVSECOPS',
    title: 'Security (DevSecOps)',
    description: 'Security practices integrated throughout the development lifecycle.',
    principles: [
      {
        title: 'Security-by-Design',
        description:
          'Include threat modeling, data classification, and encryption decisions in the initial architecture phase.',
        examples: ['STRIDE threat modeling', 'Data flow diagrams', 'Security requirements'],
      },
      {
        title: 'Automated Security Scanning',
        description:
          'Integrate static (SAST) and dynamic (DAST) analysis, plus dependency scanning for known vulnerabilities (CVEs) into CI/CD pipelines.',
        examples: ['SonarQube', 'Snyk', 'OWASP ZAP', 'Dependabot'],
      },
      {
        title: 'Confidential Computing',
        description: 'Protect sensitive data during computation, not just at rest and in transit.',
        examples: [
          'Encrypted enclaves',
          'Secure multi-party computation',
          'Homomorphic encryption',
        ],
      },
      {
        title: 'Principle of Least Privilege',
        description: 'Grant only the minimum necessary permissions to users and systems.',
        examples: [
          'Role-based access control',
          'Just-in-time access',
          'Service accounts with minimal scope',
        ],
      },
    ],
  },
  {
    category: 'WORKFLOW_OPS',
    title: 'Workflow & Operations',
    description:
      'Operational excellence through automation, observability, and continuous improvement.',
    principles: [
      {
        title: 'CI/CD Maturity',
        description:
          'Automate builds, tests, and deployments to achieve a deployment lead time of hours rather than days.',
        examples: ['GitHub Actions', 'GitLab CI', 'ArgoCD for GitOps'],
      },
      {
        title: 'Observability First',
        description:
          'Instrument code with logging, tracing, and metrics to ensure internal states can be understood without deploying new code.',
        examples: ['OpenTelemetry', 'Structured logging', 'Distributed tracing'],
      },
      {
        title: 'FinOps & Sustainability',
        description:
          'Monitor cloud resource usage to optimize for both cost (FinOps) and carbon footprint (GreenOps).',
        examples: [
          'Cost allocation tags',
          'Right-sizing recommendations',
          'Carbon-aware computing',
        ],
      },
      {
        title: 'Progressive Delivery',
        description:
          'Use feature flags and canary deployments to limit the "blast radius" of new releases.',
        examples: ['LaunchDarkly', 'Canary releases', 'Blue-green deployments'],
      },
    ],
  },
  {
    category: 'DOCS_KNOWLEDGE',
    title: 'Documentation & Knowledge',
    description:
      'Practices for maintaining living documentation and preserving institutional knowledge.',
    principles: [
      {
        title: 'Docs-as-Code',
        description:
          'Store technical documentation (READMEs, ADRs) in the Git repository alongside the code.',
        examples: ['Markdown in repo', 'Generated API docs', 'Versioned documentation'],
      },
      {
        title: 'Document the "Why"',
        description:
          'Focus on explaining design reasoning and business logic rather than obvious implementation details.',
        examples: [
          'Architecture Decision Records',
          'Code comments explaining intent',
          'Design documents',
        ],
      },
      {
        title: 'Architecture Decision Records (ADRs)',
        description:
          'Track why specific technical choices were made to prevent knowledge loss in distributed teams.',
        examples: ['ADR templates', 'Decision logs', 'RFC process'],
      },
    ],
  },
];

// CTO Document Types with their applicable standards
const CTO_DOCUMENT_MAPPINGS: Record<string, { name: string; standards: StandardCategory[] }> = {
  'product-architecture': {
    name: 'Product Architecture',
    standards: ['MODERN_ARCHITECTURE', 'AI_ASSISTED_DEV'],
  },
  'technology-strategy': {
    name: 'Technology Strategy',
    standards: ['MODERN_ARCHITECTURE', 'AI_ASSISTED_DEV', 'WORKFLOW_OPS'],
  },
  'engineering-handbook': {
    name: 'Engineering Handbook',
    standards: ['CODING_STANDARDS', 'TESTING_QA', 'WORKFLOW_OPS', 'DOCS_KNOWLEDGE'],
  },
  'api-documentation': {
    name: 'API Documentation',
    standards: ['CODING_STANDARDS', 'DOCS_KNOWLEDGE'],
  },
  'information-security-policy': {
    name: 'Information Security Policy',
    standards: ['SECURITY_DEVSECOPS'],
  },
  'data-protection-policy': {
    name: 'Data Protection Policy',
    standards: ['SECURITY_DEVSECOPS', 'MODERN_ARCHITECTURE'],
  },
  'incident-response-plan': {
    name: 'Incident Response Plan',
    standards: ['SECURITY_DEVSECOPS', 'WORKFLOW_OPS'],
  },
  'disaster-recovery-plan': {
    name: 'Disaster Recovery Plan',
    standards: ['WORKFLOW_OPS', 'SECURITY_DEVSECOPS'],
  },
  'technology-roadmap': {
    name: 'Technology Roadmap',
    standards: ['MODERN_ARCHITECTURE', 'TESTING_QA', 'WORKFLOW_OPS'],
  },
  'data-models': {
    name: 'Data Models',
    standards: ['MODERN_ARCHITECTURE', 'CODING_STANDARDS'],
  },
  'infrastructure-design': {
    name: 'Infrastructure Design',
    standards: ['MODERN_ARCHITECTURE', 'SECURITY_DEVSECOPS', 'WORKFLOW_OPS'],
  },
  'mobile-strategy': {
    name: 'Mobile Strategy',
    standards: ['MODERN_ARCHITECTURE', 'TESTING_QA'],
  },
  'integration-architecture': {
    name: 'Integration Architecture',
    standards: ['MODERN_ARCHITECTURE', 'SECURITY_DEVSECOPS'],
  },
  'devops-pipeline': {
    name: 'DevOps Pipeline',
    standards: ['WORKFLOW_OPS', 'TESTING_QA', 'SECURITY_DEVSECOPS'],
  },
  'monitoring-alerting': {
    name: 'Monitoring & Alerting',
    standards: ['WORKFLOW_OPS'],
  },
};

export async function seedStandards(): Promise<void> {
  console.log('Seeding engineering standards...');

  // Create all engineering standards
  const standardsMap = new Map<StandardCategory, string>();

  for (const standardData of ENGINEERING_STANDARDS) {
    const standard = await prisma.engineeringStandard.upsert({
      where: { category: standardData.category },
      update: {
        title: standardData.title,
        description: standardData.description,
        principles: JSON.parse(JSON.stringify(standardData.principles)),
      },
      create: {
        category: standardData.category,
        title: standardData.title,
        description: standardData.description,
        principles: JSON.parse(JSON.stringify(standardData.principles)),
        version: '2026',
      },
    });
    standardsMap.set(standardData.category, standard.id);
    console.log(`  Created/updated standard: ${standardData.title}`);
  }

  console.log('Seeding CTO document types with standard mappings...');

  // Create CTO document types and their mappings
  for (const [slug, docData] of Object.entries(CTO_DOCUMENT_MAPPINGS)) {
    // Upsert the document type
    const documentType = await prisma.documentType.upsert({
      where: { slug },
      update: {
        name: docData.name,
      },
      create: {
        name: docData.name,
        slug,
        category: 'CTO' as DocumentCategory,
        description: `${docData.name} document for technical documentation package.`,
        outputFormats: ['PDF', 'DOCX'],
      },
    });

    // Create standard mappings
    for (let i = 0; i < docData.standards.length; i++) {
      const standardCategory = docData.standards[i];
      const standardId = standardsMap.get(standardCategory);

      if (standardId) {
        await prisma.documentTypeStandard.upsert({
          where: {
            documentTypeId_standardId: {
              documentTypeId: documentType.id,
              standardId,
            },
          },
          update: {
            priority: i,
          },
          create: {
            documentTypeId: documentType.id,
            standardId,
            priority: i,
            isRequired: true,
          },
        });
      }
    }

    console.log(
      `  Created/updated document type: ${docData.name} with ${docData.standards.length} standards`,
    );
  }

  console.log('Engineering standards seeding complete!');
}

// Allow running directly
if (require.main === module) {
  void seedStandards()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    })
    .finally(() => void prisma.$disconnect());
}
