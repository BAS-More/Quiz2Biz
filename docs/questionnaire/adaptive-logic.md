# Adaptive Logic Engine

## Document Control
| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-01-25 | System | Initial adaptive logic specification |

---

## 1. Overview

The Adaptive Logic Engine is the intelligence layer that determines which questions to show, hide, require, or skip based on user responses. This document defines the rules, conditions, and evaluation mechanisms.

### 1.1 Core Principles

1. **Relevance**: Only show questions relevant to the user's context
2. **Efficiency**: Minimize time-to-completion by skipping irrelevant paths
3. **Completeness**: Ensure all necessary information is gathered
4. **Flexibility**: Support complex conditional logic without code changes

---

## 2. Rule Types

### 2.1 Visibility Rules

Control whether a question is shown or hidden.

```typescript
interface VisibilityRule {
  id: string;
  targetQuestionId: string;
  conditions: Condition[];
  operator: 'AND' | 'OR';
  action: 'show' | 'hide';
}
```

**Example:**
```json
{
  "id": "VR-001",
  "targetQuestionId": "PS-002",
  "conditions": [
    {
      "questionId": "PS-001",
      "operator": "equals",
      "value": "other"
    }
  ],
  "operator": "AND",
  "action": "show"
}
```

### 2.2 Requirement Rules

Control whether a question becomes required based on context.

```typescript
interface RequirementRule {
  id: string;
  targetQuestionId: string;
  conditions: Condition[];
  operator: 'AND' | 'OR';
  action: 'require' | 'optional';
}
```

**Example:**
```json
{
  "id": "RR-001",
  "targetQuestionId": "SC-002",
  "conditions": [
    {
      "questionId": "SC-001",
      "operator": "includes",
      "value": "phi"
    }
  ],
  "operator": "AND",
  "action": "require"
}
```

### 2.3 Skip Rules

Allow entire sections to be skipped based on responses.

```typescript
interface SkipRule {
  id: string;
  targetSection: string;
  conditions: Condition[];
  operator: 'AND' | 'OR';
  skipMessage: string;
}
```

**Example:**
```json
{
  "id": "SR-001",
  "targetSection": "technology_requirements",
  "conditions": [
    {
      "questionId": "PS-001",
      "operator": "equals",
      "value": "consulting"
    }
  ],
  "operator": "AND",
  "skipMessage": "Technology requirements not applicable for consulting services"
}
```

### 2.4 Branching Rules

Direct users to different question paths.

```typescript
interface BranchingRule {
  id: string;
  sourceQuestionId: string;
  branches: Branch[];
  defaultPath: string;
}

interface Branch {
  conditions: Condition[];
  targetPath: string;
  priority: number;
}
```

---

## 3. Condition Operators

### 3.1 Comparison Operators

| Operator | Description | Applicable Types |
|----------|-------------|------------------|
| `equals` | Exact match | All |
| `not_equals` | Not equal | All |
| `includes` | Array contains value | multi_choice |
| `not_includes` | Array does not contain | multi_choice |
| `in` | Value is in array | single_choice |
| `not_in` | Value is not in array | single_choice |
| `greater_than` | Numeric comparison | number |
| `less_than` | Numeric comparison | number |
| `between` | Range comparison | number, date |
| `contains` | String contains | text |
| `starts_with` | String starts with | text |
| `ends_with` | String ends with | text |
| `matches` | Regex match | text |
| `is_empty` | Has no value | All |
| `is_not_empty` | Has a value | All |

### 3.2 Condition Schema

```typescript
interface Condition {
  questionId: string;
  operator: ConditionOperator;
  value: string | number | string[] | null;
  caseSensitive?: boolean;
}
```

---

## 4. Complete Rule Definitions

### 4.1 Business Foundation Rules

```yaml
# Show detailed company info for existing businesses
VR-BF-001:
  target: BF-003
  condition: BF-002 != 'internal'
  action: show
  description: "Show founding date for non-internal projects"

# Require mission/vision for investor-backed companies
RR-BF-001:
  target: [BF-008, BF-009]
  condition: BM-006 IN ['seed', 'series_a', 'series_b_plus']
  action: require
  description: "Mission and vision required for funded companies"
```

### 4.2 Product/Service Rules

```yaml
# Show custom product type field
VR-PS-001:
  target: PS-002
  condition: PS-001 == 'other'
  action: show

# Different feature sets for different product types
BR-PS-001:
  source: PS-001
  branches:
    - condition: PS-001 == 'software_saas'
      path: saas_features
      priority: 1
    - condition: PS-001 == 'mobile_app'
      path: mobile_features
      priority: 2
    - condition: PS-001 == 'marketplace'
      path: marketplace_features
      priority: 3
    - condition: PS-001 == 'ecommerce'
      path: ecommerce_features
      priority: 4
  default: generic_features

# Show existing stack question
VR-PS-002:
  target: TR-003
  condition: TR-002 == 'existing'
  action: show
```

### 4.3 Target Market Rules

```yaml
# Industry-specific questions
BR-TM-001:
  source: TM-003
  branches:
    - condition: TM-003 INCLUDES 'healthcare'
      path: healthcare_compliance
      priority: 1
    - condition: TM-003 INCLUDES 'finance'
      path: financial_compliance
      priority: 2
    - condition: TM-003 INCLUDES 'education'
      path: education_compliance
      priority: 3
  default: standard_compliance

# B2B vs B2C paths
BR-TM-002:
  source: TM-001
  branches:
    - condition: TM-001 IN ['b2c']
      path: consumer_market_questions
      priority: 1
    - condition: TM-001 IN ['b2b_smb', 'b2b_enterprise', 'b2g']
      path: business_market_questions
      priority: 2
  default: mixed_market_questions
```

### 4.4 Technology Requirements Rules

```yaml
# Platform-specific integrations
VR-TR-001:
  target: ios_specific_questions
  condition: TR-001 INCLUDES 'ios_native'
  action: show

VR-TR-002:
  target: android_specific_questions
  condition: TR-001 INCLUDES 'android_native'
  action: show

# Skip tech questions for no-code preference
SR-TR-001:
  target: detailed_tech_section
  condition: TO-004 == 'no_code'
  skipMessage: "Technical architecture details not required for no-code solutions"

# Require scalability details for large scale
RR-TR-001:
  target: [TR-SCALE-001, TR-SCALE-002, TR-SCALE-003]
  condition: TR-005 IN ['enterprise', 'massive']
  action: require
```

### 4.5 Security & Compliance Rules

```yaml
# HIPAA-specific questions
VR-SC-001:
  target: hipaa_questions_section
  condition: SC-001 INCLUDES 'phi'
  action: show

# PCI-DSS questions for payment data
VR-SC-002:
  target: pci_questions_section
  condition: SC-001 INCLUDES 'financial'
  action: show

# COPPA questions for children's data
VR-SC-003:
  target: coppa_questions_section
  condition: SC-001 INCLUDES 'children'
  action: show

# Require MFA for sensitive data
RR-SC-001:
  target: SC-003
  condition: SC-001 INCLUDES_ANY ['phi', 'financial', 'pii']
  action: require
  additionalValidation:
    mustInclude: 'mfa'
    message: "MFA is required for handling sensitive data types"

# Geographic compliance requirements
BR-SC-001:
  source: TM-004
  branches:
    - condition: TM-004 INCLUDES 'europe'
      addCompliance: 'gdpr'
      priority: 1
    - condition: TM-004 INCLUDES 'north_america'
      addCompliance: 'ccpa'
      priority: 2
```

### 4.6 Business Model Rules

```yaml
# Subscription-specific questions
VR-BM-001:
  target: BM-002
  condition: BM-001 IN ['subscription', 'freemium']
  action: show

# Skip pricing for certain models
SR-BM-001:
  target: pricing_details_section
  condition: BM-001 == 'advertising'
  skipMessage: "Standard pricing section not applicable for ad-supported models"

# Investment questions for funded companies
VR-BM-002:
  target: investor_details_section
  condition: BM-006 IN ['seed', 'series_a', 'series_b_plus']
  action: show

# Revenue questions for existing businesses
VR-BM-003:
  target: BM-008
  condition: BF-002 IN ['existing', 'pivot']
  action: show
```

### 4.7 Team & Operations Rules

```yaml
# Hiring questions for teams without tech
VR-TO-001:
  target: TO-003
  condition: TO-002 IN ['no_tech', 'limited', 'outsourced']
  action: show

# Development approach impacts
BR-TO-001:
  source: TO-004
  branches:
    - condition: TO-004 == 'in_house'
      path: internal_team_questions
      priority: 1
    - condition: TO-004 == 'agency'
      path: agency_questions
      priority: 2
    - condition: TO-004 == 'freelancers'
      path: freelancer_questions
      priority: 3
  default: hybrid_team_questions
```

### 4.8 Timeline Rules

```yaml
# Hard deadline details
VR-TL-001:
  target: TL-003
  condition: TL-002 != 'no'
  action: show

# Expedited process warning
WARN-TL-001:
  trigger: TL-001 == 'asap' AND TL-002 != 'no'
  message: "Expedited timelines may impact scope and quality. Consider prioritizing MVP features."
  type: advisory
```

---

## 5. Evaluation Engine

### 5.1 Rule Evaluation Order

```
1. Global Rules (applied to all sessions)
2. Industry-Specific Rules (based on TM-003)
3. Product Type Rules (based on PS-001)
4. Section Rules (per-section visibility)
5. Question Rules (individual question conditions)
```

### 5.2 Evaluation Algorithm

```typescript
class AdaptiveLogicEngine {
  private rules: Rule[];
  private responses: Map<string, any>;

  evaluateQuestion(questionId: string): QuestionState {
    // Get all rules targeting this question
    const applicableRules = this.rules.filter(
      r => r.targetQuestionId === questionId
    );

    // Default state
    let state: QuestionState = {
      visible: true,
      required: this.getBaseRequirement(questionId),
      disabled: false,
      warnings: []
    };

    // Apply visibility rules
    for (const rule of applicableRules.filter(r => r.type === 'visibility')) {
      if (this.evaluateConditions(rule.conditions, rule.operator)) {
        state.visible = rule.action === 'show';
      }
    }

    // Apply requirement rules (only if visible)
    if (state.visible) {
      for (const rule of applicableRules.filter(r => r.type === 'requirement')) {
        if (this.evaluateConditions(rule.conditions, rule.operator)) {
          state.required = rule.action === 'require';
        }
      }
    }

    return state;
  }

  evaluateConditions(conditions: Condition[], operator: 'AND' | 'OR'): boolean {
    const results = conditions.map(c => this.evaluateCondition(c));
    
    if (operator === 'AND') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  evaluateCondition(condition: Condition): boolean {
    const value = this.responses.get(condition.questionId);
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'includes':
        return Array.isArray(value) && value.includes(condition.value);
      case 'not_includes':
        return Array.isArray(value) && !value.includes(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      case 'between':
        const [min, max] = condition.value as [number, number];
        return Number(value) >= min && Number(value) <= max;
      case 'is_empty':
        return value === null || value === undefined || value === '';
      case 'is_not_empty':
        return value !== null && value !== undefined && value !== '';
      default:
        return false;
    }
  }

  getNextQuestion(currentQuestionId: string): string | null {
    // Check for branching rules
    const branchingRules = this.rules.filter(
      r => r.type === 'branching' && r.sourceQuestionId === currentQuestionId
    );

    for (const rule of branchingRules) {
      for (const branch of rule.branches.sort((a, b) => a.priority - b.priority)) {
        if (this.evaluateConditions(branch.conditions, 'AND')) {
          return this.getFirstQuestionInPath(branch.targetPath);
        }
      }
      return this.getFirstQuestionInPath(rule.defaultPath);
    }

    // Default: return next question in sequence
    return this.getSequentialNext(currentQuestionId);
  }
}
```

### 5.3 Performance Optimization

```typescript
// Cache evaluated states
const evaluationCache = new Map<string, QuestionState>();

// Invalidate cache when response changes
function onResponseChange(questionId: string, value: any) {
  // Get all questions that depend on this question
  const dependentQuestions = getDependencies(questionId);
  
  // Invalidate their cache entries
  for (const depId of dependentQuestions) {
    evaluationCache.delete(depId);
  }
}

// Pre-compute dependency graph
function buildDependencyGraph(rules: Rule[]): DependencyGraph {
  const graph = new Map<string, Set<string>>();
  
  for (const rule of rules) {
    for (const condition of rule.conditions) {
      if (!graph.has(condition.questionId)) {
        graph.set(condition.questionId, new Set());
      }
      graph.get(condition.questionId)!.add(rule.targetQuestionId);
    }
  }
  
  return graph;
}
```

---

## 6. Branching Paths

### 6.1 Product Type Paths

```yaml
saas_features:
  questions:
    - SAAS-001: "What type of SaaS model?"
      options: [single_tenant, multi_tenant, hybrid]
    - SAAS-002: "Do you need white-labeling capabilities?"
    - SAAS-003: "What subscription billing features?"
    - SAAS-004: "Do you need usage-based pricing?"

mobile_features:
  questions:
    - MOB-001: "Offline functionality required?"
    - MOB-002: "Push notification requirements?"
    - MOB-003: "Device features needed?"
      options: [camera, gps, bluetooth, nfc, biometrics]
    - MOB-004: "App store distribution strategy?"

marketplace_features:
  questions:
    - MKT-001: "Two-sided or multi-sided marketplace?"
    - MKT-002: "Payment escrow needed?"
    - MKT-003: "Seller verification requirements?"
    - MKT-004: "Commission structure?"

ecommerce_features:
  questions:
    - ECOM-001: "Product catalog size?"
    - ECOM-002: "Inventory management needed?"
    - ECOM-003: "Shipping integration requirements?"
    - ECOM-004: "Tax calculation requirements?"
```

### 6.2 Industry Compliance Paths

```yaml
healthcare_compliance:
  questions:
    - HC-001: "Will you store or transmit PHI?"
    - HC-002: "Do you need BAA agreements?"
    - HC-003: "HL7/FHIR integration needed?"
    - HC-004: "Audit logging requirements?"

financial_compliance:
  questions:
    - FIN-001: "PCI compliance level needed?"
    - FIN-002: "Will you process ACH transactions?"
    - FIN-003: "KYC/AML requirements?"
    - FIN-004: "Regulatory reporting needed?"

education_compliance:
  questions:
    - EDU-001: "FERPA compliance needed?"
    - EDU-002: "Student data handling?"
    - EDU-003: "LTI integration requirements?"
    - EDU-004: "Accessibility beyond WCAG?"
```

### 6.3 Market Type Paths

```yaml
consumer_market_questions:
  questions:
    - CON-001: "Age demographic target?"
    - CON-002: "Acquisition channels?"
      options: [organic_search, paid_ads, social, influencer, app_store]
    - CON-003: "Viral/referral mechanics?"
    - CON-004: "Gamification elements?"

business_market_questions:
  questions:
    - BIZ-001: "Typical deal size?"
    - BIZ-002: "Sales cycle length?"
    - BIZ-003: "Decision maker roles?"
    - BIZ-004: "Enterprise features needed?"
      options: [sso, audit_logs, rbac, sla, custom_contracts]
```

---

## 7. Conditional Validation

### 7.1 Dynamic Validation Rules

```yaml
DV-001:
  question: BM-003  # Target price point
  conditions:
    - when: TM-001 == 'b2c'
      validation:
        recommended_range: [0, 50]
        warning_above: 100
        message: "B2C products typically have lower price points"
    - when: TM-001 == 'b2b_enterprise'
      validation:
        recommended_range: [200, 10000]
        warning_below: 100
        message: "Enterprise products typically command premium pricing"

DV-002:
  question: TL-001  # MVP timeline
  conditions:
    - when: PS-008.length > 10
      validation:
        warning: true
        message: "10+ MVP features may require longer timeline"
        suggested_value: "3_6_months"
```

### 7.2 Cross-Question Validation

```typescript
interface CrossValidation {
  id: string;
  questions: string[];
  validator: (values: any[]) => ValidationResult;
}

const crossValidations: CrossValidation[] = [
  {
    id: 'CV-001',
    questions: ['BM-004', 'BM-005'],  // CAC and LTV
    validator: (values) => {
      const [cac, ltv] = values;
      const ratio = parseLTV(ltv) / parseCAC(cac);
      if (ratio < 3) {
        return {
          valid: false,
          warning: 'LTV:CAC ratio below 3:1 may not be sustainable',
          severity: 'warning'
        };
      }
      return { valid: true };
    }
  },
  {
    id: 'CV-002',
    questions: ['TR-005', 'BM-007'],  // Scalability vs Budget
    validator: (values) => {
      const [scale, budget] = values;
      if (scale === 'massive' && budget === 'under_5k') {
        return {
          valid: false,
          warning: 'Massive scale typically requires larger infrastructure budget',
          severity: 'error'
        };
      }
      return { valid: true };
    }
  }
];
```

---

## 8. Smart Defaults

### 8.1 Context-Aware Defaults

```yaml
# Default compliance based on geography
SD-001:
  question: SC-002  # Compliance standards
  defaults:
    - when: TM-004 INCLUDES 'europe'
      default: ['gdpr']
    - when: TM-004 INCLUDES_ANY ['north_america', 'global']
      default: ['ccpa']
    - when: TM-003 INCLUDES 'healthcare'
      default: ['hipaa']
    - when: TM-003 INCLUDES 'finance'
      default: ['pci', 'soc2']

# Default features based on product type
SD-002:
  question: PS-008  # MVP features
  defaults:
    - when: PS-001 == 'software_saas'
      default: ['user_auth', 'user_profiles', 'subscriptions', 'admin_panel']
    - when: PS-001 == 'mobile_app'
      default: ['user_auth', 'notifications', 'analytics']
    - when: PS-001 == 'ecommerce'
      default: ['user_auth', 'payments', 'search', 'analytics']
```

### 8.2 Progressive Disclosure Defaults

```typescript
// Show advanced options only after basic completion
const progressiveDisclosure = {
  basic: ['BF-*', 'PS-001', 'PS-003', 'PS-004', 'TM-001'],
  intermediate: ['PS-*', 'TM-*', 'TR-001', 'BM-001'],
  advanced: ['TR-*', 'SC-*', 'SM-*']
};

function getVisibleQuestions(completionLevel: number): string[] {
  if (completionLevel < 30) return progressiveDisclosure.basic;
  if (completionLevel < 60) return [...progressiveDisclosure.basic, ...progressiveDisclosure.intermediate];
  return [...progressiveDisclosure.basic, ...progressiveDisclosure.intermediate, ...progressiveDisclosure.advanced];
}
```

---

## 9. Rule Management

### 9.1 Rule Priority

```typescript
enum RulePriority {
  SYSTEM = 0,      // Built-in rules, cannot be overridden
  INDUSTRY = 100,  // Industry-specific rules
  PRODUCT = 200,   // Product type rules
  CUSTOM = 300,    // Customer-specific rules
  USER = 400       // User-defined rules
}
```

### 9.2 Rule Conflict Resolution

```typescript
function resolveConflicts(rules: Rule[]): Rule {
  // Higher priority wins
  const sorted = rules.sort((a, b) => b.priority - a.priority);
  
  // For same priority, most specific wins
  const mostSpecific = sorted.reduce((prev, curr) => {
    if (prev.priority === curr.priority) {
      return curr.conditions.length > prev.conditions.length ? curr : prev;
    }
    return prev;
  });
  
  return mostSpecific;
}
```

### 9.3 Rule Testing

```typescript
// Test suite for adaptive logic
describe('AdaptiveLogicEngine', () => {
  it('should show PS-002 when PS-001 is "other"', () => {
    const engine = new AdaptiveLogicEngine(rules);
    engine.setResponse('PS-001', 'other');
    
    const state = engine.evaluateQuestion('PS-002');
    expect(state.visible).toBe(true);
  });

  it('should hide PS-002 when PS-001 is "software_saas"', () => {
    const engine = new AdaptiveLogicEngine(rules);
    engine.setResponse('PS-001', 'software_saas');
    
    const state = engine.evaluateQuestion('PS-002');
    expect(state.visible).toBe(false);
  });

  it('should require SC-002 when handling PHI', () => {
    const engine = new AdaptiveLogicEngine(rules);
    engine.setResponse('SC-001', ['phi']);
    
    const state = engine.evaluateQuestion('SC-002');
    expect(state.required).toBe(true);
  });
});
```

---

## 10. Analytics and Optimization

### 10.1 Rule Effectiveness Tracking

```typescript
interface RuleMetrics {
  ruleId: string;
  triggeredCount: number;
  averageSessionCompletion: number;
  dropOffRate: number;
  feedbackScore: number;
}

// Track which rules are triggered most
function trackRuleUsage(ruleId: string, sessionId: string) {
  analytics.track('rule_triggered', {
    ruleId,
    sessionId,
    timestamp: Date.now()
  });
}
```

### 10.2 Path Analysis

```typescript
// Identify most common paths through questionnaire
function analyzeCommonPaths(): PathAnalysis[] {
  const sessions = getAllCompletedSessions();
  const pathCounts = new Map<string, number>();

  for (const session of sessions) {
    const pathKey = session.questionOrder.join('->');
    pathCounts.set(pathKey, (pathCounts.get(pathKey) || 0) + 1);
  }

  return Array.from(pathCounts.entries())
    .map(([path, count]) => ({
      path: path.split('->'),
      count,
      percentage: count / sessions.length * 100
    }))
    .sort((a, b) => b.count - a.count);
}
```

---

## Appendix A: Rule Definition Examples (JSON)

```json
{
  "rules": [
    {
      "id": "VR-001",
      "type": "visibility",
      "targetQuestionId": "PS-002",
      "conditions": [
        {
          "questionId": "PS-001",
          "operator": "equals",
          "value": "other"
        }
      ],
      "operator": "AND",
      "action": "show",
      "priority": 200,
      "enabled": true,
      "description": "Show custom product type field when 'Other' is selected"
    },
    {
      "id": "BR-001",
      "type": "branching",
      "sourceQuestionId": "TM-003",
      "branches": [
        {
          "conditions": [
            {
              "questionId": "TM-003",
              "operator": "includes",
              "value": "healthcare"
            }
          ],
          "targetPath": "healthcare_compliance",
          "priority": 1
        },
        {
          "conditions": [
            {
              "questionId": "TM-003",
              "operator": "includes",
              "value": "finance"
            }
          ],
          "targetPath": "financial_compliance",
          "priority": 2
        }
      ],
      "defaultPath": "standard_compliance",
      "priority": 100,
      "enabled": true,
      "description": "Route to industry-specific compliance questions"
    }
  ]
}
```

---

*The Adaptive Logic Engine ensures users experience a personalized questionnaire flow that gathers all necessary information while respecting their time and context.*
# Adaptive Logic Engine

## Document Control
| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-01-25 | System | Initial adaptive logic specification |

---

## 1. Overview

The Adaptive Logic Engine is the intelligence layer that determines which questions to show, hide, require, or skip based on user responses. This document defines the rules, conditions, and evaluation mechanisms.

### 1.1 Core Principles

1. **Relevance**: Only show questions relevant to the user's context
2. **Efficiency**: Minimize time-to-completion by skipping irrelevant paths
3. **Completeness**: Ensure all necessary information is gathered
4. **Flexibility**: Support complex conditional logic without code changes

---

## 2. Rule Types

### 2.1 Visibility Rules

Control whether a question is shown or hidden.

```typescript
interface VisibilityRule {
  id: string;
  targetQuestionId: string;
  conditions: Condition[];
  operator: 'AND' | 'OR';
  action: 'show' | 'hide';
}
```

**Example:**
```json
{
  "id": "VR-001",
  "targetQuestionId": "PS-002",
  "conditions": [
    {
      "questionId": "PS-001",
      "operator": "equals",
      "value": "other"
    }
  ],
  "operator": "AND",
  "action": "show"
}
```

### 2.2 Requirement Rules

Control whether a question becomes required based on context.

```typescript
interface RequirementRule {
  id: string;
  targetQuestionId: string;
  conditions: Condition[];
  operator: 'AND' | 'OR';
  action: 'require' | 'optional';
}
```

**Example:**
```json
{
  "id": "RR-001",
  "targetQuestionId": "SC-002",
  "conditions": [
    {
      "questionId": "SC-001",
      "operator": "includes",
      "value": "phi"
    }
  ],
  "operator": "AND",
  "action": "require"
}
```

### 2.3 Skip Rules

Allow entire sections to be skipped based on responses.

```typescript
interface SkipRule {
  id: string;
  targetSection: string;
  conditions: Condition[];
  operator: 'AND' | 'OR';
  skipMessage: string;
}
```

**Example:**
```json
{
  "id": "SR-001",
  "targetSection": "technology_requirements",
  "conditions": [
    {
      "questionId": "PS-001",
      "operator": "equals",
      "value": "consulting"
    }
  ],
  "operator": "AND",
  "skipMessage": "Technology requirements not applicable for consulting services"
}
```

### 2.4 Branching Rules

Direct users to different question paths.

```typescript
interface BranchingRule {
  id: string;
  sourceQuestionId: string;
  branches: Branch[];
  defaultPath: string;
}

interface Branch {
  conditions: Condition[];
  targetPath: string;
  priority: number;
}
```

---

## 3. Condition Operators

### 3.1 Comparison Operators

| Operator | Description | Applicable Types |
|----------|-------------|------------------|
| `equals` | Exact match | All |
| `not_equals` | Not equal | All |
| `includes` | Array contains value | multi_choice |
| `not_includes` | Array does not contain | multi_choice |
| `in` | Value is in array | single_choice |
| `not_in` | Value is not in array | single_choice |
| `greater_than` | Numeric comparison | number |
| `less_than` | Numeric comparison | number |
| `between` | Range comparison | number, date |
| `contains` | String contains | text |
| `starts_with` | String starts with | text |
| `ends_with` | String ends with | text |
| `matches` | Regex match | text |
| `is_empty` | Has no value | All |
| `is_not_empty` | Has a value | All |

### 3.2 Condition Schema

```typescript
interface Condition {
  questionId: string;
  operator: ConditionOperator;
  value: string | number | string[] | null;
  caseSensitive?: boolean;
}
```

---

## 4. Complete Rule Definitions

### 4.1 Business Foundation Rules

```yaml
# Show detailed company info for existing businesses
VR-BF-001:
  target: BF-003
  condition: BF-002 != 'internal'
  action: show
  description: "Show founding date for non-internal projects"

# Require mission/vision for investor-backed companies
RR-BF-001:
  target: [BF-008, BF-009]
  condition: BM-006 IN ['seed', 'series_a', 'series_b_plus']
  action: require
  description: "Mission and vision required for funded companies"
```

### 4.2 Product/Service Rules

```yaml
# Show custom product type field
VR-PS-001:
  target: PS-002
  condition: PS-001 == 'other'
  action: show

# Different feature sets for different product types
BR-PS-001:
  source: PS-001
  branches:
    - condition: PS-001 == 'software_saas'
      path: saas_features
      priority: 1
    - condition: PS-001 == 'mobile_app'
      path: mobile_features
      priority: 2
    - condition: PS-001 == 'marketplace'
      path: marketplace_features
      priority: 3
    - condition: PS-001 == 'ecommerce'
      path: ecommerce_features
      priority: 4
  default: generic_features

# Show existing stack question
VR-PS-002:
  target: TR-003
  condition: TR-002 == 'existing'
  action: show
```

### 4.3 Target Market Rules

```yaml
# Industry-specific questions
BR-TM-001:
  source: TM-003
  branches:
    - condition: TM-003 INCLUDES 'healthcare'
      path: healthcare_compliance
      priority: 1
    - condition: TM-003 INCLUDES 'finance'
      path: financial_compliance
      priority: 2
    - condition: TM-003 INCLUDES 'education'
      path: education_compliance
      priority: 3
  default: standard_compliance

# B2B vs B2C paths
BR-TM-002:
  source: TM-001
  branches:
    - condition: TM-001 IN ['b2c']
      path: consumer_market_questions
      priority: 1
    - condition: TM-001 IN ['b2b_smb', 'b2b_enterprise', 'b2g']
      path: business_market_questions
      priority: 2
  default: mixed_market_questions
```

### 4.4 Technology Requirements Rules

```yaml
# Platform-specific integrations
VR-TR-001:
  target: ios_specific_questions
  condition: TR-001 INCLUDES 'ios_native'
  action: show

VR-TR-002:
  target: android_specific_questions
  condition: TR-001 INCLUDES 'android_native'
  action: show

# Skip tech questions for no-code preference
SR-TR-001:
  target: detailed_tech_section
  condition: TO-004 == 'no_code'
  skipMessage: "Technical architecture details not required for no-code solutions"

# Require scalability details for large scale
RR-TR-001:
  target: [TR-SCALE-001, TR-SCALE-002, TR-SCALE-003]
  condition: TR-005 IN ['enterprise', 'massive']
  action: require
```

### 4.5 Security & Compliance Rules

```yaml
# HIPAA-specific questions
VR-SC-001:
  target: hipaa_questions_section
  condition: SC-001 INCLUDES 'phi'
  action: show

# PCI-DSS questions for payment data
VR-SC-002:
  target: pci_questions_section
  condition: SC-001 INCLUDES 'financial'
  action: show

# COPPA questions for children's data
VR-SC-003:
  target: coppa_questions_section
  condition: SC-001 INCLUDES 'children'
  action: show

# Require MFA for sensitive data
RR-SC-001:
  target: SC-003
  condition: SC-001 INCLUDES_ANY ['phi', 'financial', 'pii']
  action: require
  additionalValidation:
    mustInclude: 'mfa'
    message: "MFA is required for handling sensitive data types"

# Geographic compliance requirements
BR-SC-001:
  source: TM-004
  branches:
    - condition: TM-004 INCLUDES 'europe'
      addCompliance: 'gdpr'
      priority: 1
    - condition: TM-004 INCLUDES 'north_america'
      addCompliance: 'ccpa'
      priority: 2
```

### 4.6 Business Model Rules

```yaml
# Subscription-specific questions
VR-BM-001:
  target: BM-002
  condition: BM-001 IN ['subscription', 'freemium']
  action: show

# Skip pricing for certain models
SR-BM-001:
  target: pricing_details_section
  condition: BM-001 == 'advertising'
  skipMessage: "Standard pricing section not applicable for ad-supported models"

# Investment questions for funded companies
VR-BM-002:
  target: investor_details_section
  condition: BM-006 IN ['seed', 'series_a', 'series_b_plus']
  action: show

# Revenue questions for existing businesses
VR-BM-003:
  target: BM-008
  condition: BF-002 IN ['existing', 'pivot']
  action: show
```

### 4.7 Team & Operations Rules

```yaml
# Hiring questions for teams without tech
VR-TO-001:
  target: TO-003
  condition: TO-002 IN ['no_tech', 'limited', 'outsourced']
  action: show

# Development approach impacts
BR-TO-001:
  source: TO-004
  branches:
    - condition: TO-004 == 'in_house'
      path: internal_team_questions
      priority: 1
    - condition: TO-004 == 'agency'
      path: agency_questions
      priority: 2
    - condition: TO-004 == 'freelancers'
      path: freelancer_questions
      priority: 3
  default: hybrid_team_questions
```

### 4.8 Timeline Rules

```yaml
# Hard deadline details
VR-TL-001:
  target: TL-003
  condition: TL-002 != 'no'
  action: show

# Expedited process warning
WARN-TL-001:
  trigger: TL-001 == 'asap' AND TL-002 != 'no'
  message: "Expedited timelines may impact scope and quality. Consider prioritizing MVP features."
  type: advisory
```

---

## 5. Evaluation Engine

### 5.1 Rule Evaluation Order

```
1. Global Rules (applied to all sessions)
2. Industry-Specific Rules (based on TM-003)
3. Product Type Rules (based on PS-001)
4. Section Rules (per-section visibility)
5. Question Rules (individual question conditions)
```

### 5.2 Evaluation Algorithm

```typescript
class AdaptiveLogicEngine {
  private rules: Rule[];
  private responses: Map<string, any>;

  evaluateQuestion(questionId: string): QuestionState {
    // Get all rules targeting this question
    const applicableRules = this.rules.filter(
      r => r.targetQuestionId === questionId
    );

    // Default state
    let state: QuestionState = {
      visible: true,
      required: this.getBaseRequirement(questionId),
      disabled: false,
      warnings: []
    };

    // Apply visibility rules
    for (const rule of applicableRules.filter(r => r.type === 'visibility')) {
      if (this.evaluateConditions(rule.conditions, rule.operator)) {
        state.visible = rule.action === 'show';
      }
    }

    // Apply requirement rules (only if visible)
    if (state.visible) {
      for (const rule of applicableRules.filter(r => r.type === 'requirement')) {
        if (this.evaluateConditions(rule.conditions, rule.operator)) {
          state.required = rule.action === 'require';
        }
      }
    }

    return state;
  }

  evaluateConditions(conditions: Condition[], operator: 'AND' | 'OR'): boolean {
    const results = conditions.map(c => this.evaluateCondition(c));
    
    if (operator === 'AND') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  evaluateCondition(condition: Condition): boolean {
    const value = this.responses.get(condition.questionId);
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'includes':
        return Array.isArray(value) && value.includes(condition.value);
      case 'not_includes':
        return Array.isArray(value) && !value.includes(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      case 'between':
        const [min, max] = condition.value as [number, number];
        return Number(value) >= min && Number(value) <= max;
      case 'is_empty':
        return value === null || value === undefined || value === '';
      case 'is_not_empty':
        return value !== null && value !== undefined && value !== '';
      default:
        return false;
    }
  }

  getNextQuestion(currentQuestionId: string): string | null {
    // Check for branching rules
    const branchingRules = this.rules.filter(
      r => r.type === 'branching' && r.sourceQuestionId === currentQuestionId
    );

    for (const rule of branchingRules) {
      for (const branch of rule.branches.sort((a, b) => a.priority - b.priority)) {
        if (this.evaluateConditions(branch.conditions, 'AND')) {
          return this.getFirstQuestionInPath(branch.targetPath);
        }
      }
      return this.getFirstQuestionInPath(rule.defaultPath);
    }

    // Default: return next question in sequence
    return this.getSequentialNext(currentQuestionId);
  }
}
```

### 5.3 Performance Optimization

```typescript
// Cache evaluated states
const evaluationCache = new Map<string, QuestionState>();

// Invalidate cache when response changes
function onResponseChange(questionId: string, value: any) {
  // Get all questions that depend on this question
  const dependentQuestions = getDependencies(questionId);
  
  // Invalidate their cache entries
  for (const depId of dependentQuestions) {
    evaluationCache.delete(depId);
  }
}

// Pre-compute dependency graph
function buildDependencyGraph(rules: Rule[]): DependencyGraph {
  const graph = new Map<string, Set<string>>();
  
  for (const rule of rules) {
    for (const condition of rule.conditions) {
      if (!graph.has(condition.questionId)) {
        graph.set(condition.questionId, new Set());
      }
      graph.get(condition.questionId)!.add(rule.targetQuestionId);
    }
  }
  
  return graph;
}
```

---

## 6. Branching Paths

### 6.1 Product Type Paths

```yaml
saas_features:
  questions:
    - SAAS-001: "What type of SaaS model?"
      options: [single_tenant, multi_tenant, hybrid]
    - SAAS-002: "Do you need white-labeling capabilities?"
    - SAAS-003: "What subscription billing features?"
    - SAAS-004: "Do you need usage-based pricing?"

mobile_features:
  questions:
    - MOB-001: "Offline functionality required?"
    - MOB-002: "Push notification requirements?"
    - MOB-003: "Device features needed?"
      options: [camera, gps, bluetooth, nfc, biometrics]
    - MOB-004: "App store distribution strategy?"

marketplace_features:
  questions:
    - MKT-001: "Two-sided or multi-sided marketplace?"
    - MKT-002: "Payment escrow needed?"
    - MKT-003: "Seller verification requirements?"
    - MKT-004: "Commission structure?"

ecommerce_features:
  questions:
    - ECOM-001: "Product catalog size?"
    - ECOM-002: "Inventory management needed?"
    - ECOM-003: "Shipping integration requirements?"
    - ECOM-004: "Tax calculation requirements?"
```

### 6.2 Industry Compliance Paths

```yaml
healthcare_compliance:
  questions:
    - HC-001: "Will you store or transmit PHI?"
    - HC-002: "Do you need BAA agreements?"
    - HC-003: "HL7/FHIR integration needed?"
    - HC-004: "Audit logging requirements?"

financial_compliance:
  questions:
    - FIN-001: "PCI compliance level needed?"
    - FIN-002: "Will you process ACH transactions?"
    - FIN-003: "KYC/AML requirements?"
    - FIN-004: "Regulatory reporting needed?"

education_compliance:
  questions:
    - EDU-001: "FERPA compliance needed?"
    - EDU-002: "Student data handling?"
    - EDU-003: "LTI integration requirements?"
    - EDU-004: "Accessibility beyond WCAG?"
```

### 6.3 Market Type Paths

```yaml
consumer_market_questions:
  questions:
    - CON-001: "Age demographic target?"
    - CON-002: "Acquisition channels?"
      options: [organic_search, paid_ads, social, influencer, app_store]
    - CON-003: "Viral/referral mechanics?"
    - CON-004: "Gamification elements?"

business_market_questions:
  questions:
    - BIZ-001: "Typical deal size?"
    - BIZ-002: "Sales cycle length?"
    - BIZ-003: "Decision maker roles?"
    - BIZ-004: "Enterprise features needed?"
      options: [sso, audit_logs, rbac, sla, custom_contracts]
```

---

## 7. Conditional Validation

### 7.1 Dynamic Validation Rules

```yaml
DV-001:
  question: BM-003  # Target price point
  conditions:
    - when: TM-001 == 'b2c'
      validation:
        recommended_range: [0, 50]
        warning_above: 100
        message: "B2C products typically have lower price points"
    - when: TM-001 == 'b2b_enterprise'
      validation:
        recommended_range: [200, 10000]
        warning_below: 100
        message: "Enterprise products typically command premium pricing"

DV-002:
  question: TL-001  # MVP timeline
  conditions:
    - when: PS-008.length > 10
      validation:
        warning: true
        message: "10+ MVP features may require longer timeline"
        suggested_value: "3_6_months"
```

### 7.2 Cross-Question Validation

```typescript
interface CrossValidation {
  id: string;
  questions: string[];
  validator: (values: any[]) => ValidationResult;
}

const crossValidations: CrossValidation[] = [
  {
    id: 'CV-001',
    questions: ['BM-004', 'BM-005'],  // CAC and LTV
    validator: (values) => {
      const [cac, ltv] = values;
      const ratio = parseLTV(ltv) / parseCAC(cac);
      if (ratio < 3) {
        return {
          valid: false,
          warning: 'LTV:CAC ratio below 3:1 may not be sustainable',
          severity: 'warning'
        };
      }
      return { valid: true };
    }
  },
  {
    id: 'CV-002',
    questions: ['TR-005', 'BM-007'],  // Scalability vs Budget
    validator: (values) => {
      const [scale, budget] = values;
      if (scale === 'massive' && budget === 'under_5k') {
        return {
          valid: false,
          warning: 'Massive scale typically requires larger infrastructure budget',
          severity: 'error'
        };
      }
      return { valid: true };
    }
  }
];
```

---

## 8. Smart Defaults

### 8.1 Context-Aware Defaults

```yaml
# Default compliance based on geography
SD-001:
  question: SC-002  # Compliance standards
  defaults:
    - when: TM-004 INCLUDES 'europe'
      default: ['gdpr']
    - when: TM-004 INCLUDES_ANY ['north_america', 'global']
      default: ['ccpa']
    - when: TM-003 INCLUDES 'healthcare'
      default: ['hipaa']
    - when: TM-003 INCLUDES 'finance'
      default: ['pci', 'soc2']

# Default features based on product type
SD-002:
  question: PS-008  # MVP features
  defaults:
    - when: PS-001 == 'software_saas'
      default: ['user_auth', 'user_profiles', 'subscriptions', 'admin_panel']
    - when: PS-001 == 'mobile_app'
      default: ['user_auth', 'notifications', 'analytics']
    - when: PS-001 == 'ecommerce'
      default: ['user_auth', 'payments', 'search', 'analytics']
```

### 8.2 Progressive Disclosure Defaults

```typescript
// Show advanced options only after basic completion
const progressiveDisclosure = {
  basic: ['BF-*', 'PS-001', 'PS-003', 'PS-004', 'TM-001'],
  intermediate: ['PS-*', 'TM-*', 'TR-001', 'BM-001'],
  advanced: ['TR-*', 'SC-*', 'SM-*']
};

function getVisibleQuestions(completionLevel: number): string[] {
  if (completionLevel < 30) return progressiveDisclosure.basic;
  if (completionLevel < 60) return [...progressiveDisclosure.basic, ...progressiveDisclosure.intermediate];
  return [...progressiveDisclosure.basic, ...progressiveDisclosure.intermediate, ...progressiveDisclosure.advanced];
}
```

---

## 9. Rule Management

### 9.1 Rule Priority

```typescript
enum RulePriority {
  SYSTEM = 0,      // Built-in rules, cannot be overridden
  INDUSTRY = 100,  // Industry-specific rules
  PRODUCT = 200,   // Product type rules
  CUSTOM = 300,    // Customer-specific rules
  USER = 400       // User-defined rules
}
```

### 9.2 Rule Conflict Resolution

```typescript
function resolveConflicts(rules: Rule[]): Rule {
  // Higher priority wins
  const sorted = rules.sort((a, b) => b.priority - a.priority);
  
  // For same priority, most specific wins
  const mostSpecific = sorted.reduce((prev, curr) => {
    if (prev.priority === curr.priority) {
      return curr.conditions.length > prev.conditions.length ? curr : prev;
    }
    return prev;
  });
  
  return mostSpecific;
}
```

### 9.3 Rule Testing

```typescript
// Test suite for adaptive logic
describe('AdaptiveLogicEngine', () => {
  it('should show PS-002 when PS-001 is "other"', () => {
    const engine = new AdaptiveLogicEngine(rules);
    engine.setResponse('PS-001', 'other');
    
    const state = engine.evaluateQuestion('PS-002');
    expect(state.visible).toBe(true);
  });

  it('should hide PS-002 when PS-001 is "software_saas"', () => {
    const engine = new AdaptiveLogicEngine(rules);
    engine.setResponse('PS-001', 'software_saas');
    
    const state = engine.evaluateQuestion('PS-002');
    expect(state.visible).toBe(false);
  });

  it('should require SC-002 when handling PHI', () => {
    const engine = new AdaptiveLogicEngine(rules);
    engine.setResponse('SC-001', ['phi']);
    
    const state = engine.evaluateQuestion('SC-002');
    expect(state.required).toBe(true);
  });
});
```

---

## 10. Analytics and Optimization

### 10.1 Rule Effectiveness Tracking

```typescript
interface RuleMetrics {
  ruleId: string;
  triggeredCount: number;
  averageSessionCompletion: number;
  dropOffRate: number;
  feedbackScore: number;
}

// Track which rules are triggered most
function trackRuleUsage(ruleId: string, sessionId: string) {
  analytics.track('rule_triggered', {
    ruleId,
    sessionId,
    timestamp: Date.now()
  });
}
```

### 10.2 Path Analysis

```typescript
// Identify most common paths through questionnaire
function analyzeCommonPaths(): PathAnalysis[] {
  const sessions = getAllCompletedSessions();
  const pathCounts = new Map<string, number>();

  for (const session of sessions) {
    const pathKey = session.questionOrder.join('->');
    pathCounts.set(pathKey, (pathCounts.get(pathKey) || 0) + 1);
  }

  return Array.from(pathCounts.entries())
    .map(([path, count]) => ({
      path: path.split('->'),
      count,
      percentage: count / sessions.length * 100
    }))
    .sort((a, b) => b.count - a.count);
}
```

---

## Appendix A: Rule Definition Examples (JSON)

```json
{
  "rules": [
    {
      "id": "VR-001",
      "type": "visibility",
      "targetQuestionId": "PS-002",
      "conditions": [
        {
          "questionId": "PS-001",
          "operator": "equals",
          "value": "other"
        }
      ],
      "operator": "AND",
      "action": "show",
      "priority": 200,
      "enabled": true,
      "description": "Show custom product type field when 'Other' is selected"
    },
    {
      "id": "BR-001",
      "type": "branching",
      "sourceQuestionId": "TM-003",
      "branches": [
        {
          "conditions": [
            {
              "questionId": "TM-003",
              "operator": "includes",
              "value": "healthcare"
            }
          ],
          "targetPath": "healthcare_compliance",
          "priority": 1
        },
        {
          "conditions": [
            {
              "questionId": "TM-003",
              "operator": "includes",
              "value": "finance"
            }
          ],
          "targetPath": "financial_compliance",
          "priority": 2
        }
      ],
      "defaultPath": "standard_compliance",
      "priority": 100,
      "enabled": true,
      "description": "Route to industry-specific compliance questions"
    }
  ]
}
```

---

*The Adaptive Logic Engine ensures users experience a personalized questionnaire flow that gathers all necessary information while respecting their time and context.*
