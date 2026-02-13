# Industry Templates

## Document Control
| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-01-25 | System | Initial industry templates |

---

## 1. Overview

Industry templates customize the questionnaire experience and document output based on the user's selected industry. Each template includes:

- **Industry-Specific Questions**: Additional questions relevant to that industry
- **Compliance Requirements**: Pre-configured regulatory requirements
- **Terminology Mapping**: Industry-specific language substitutions
- **Output Customization**: Modified document sections and emphasis
- **Validation Rules**: Industry-appropriate validation

---

## 2. Template Structure

```typescript
interface IndustryTemplate {
  id: string;
  name: string;
  description: string;
  parentTemplate?: string;  // For inheritance
  
  additionalQuestions: Question[];
  requiredCompliance: string[];
  terminologyMap: Map<string, string>;
  outputCustomizations: OutputCustomization[];
  validationRules: ValidationRule[];
  defaultValues: Map<string, any>;
  riskFactors: RiskFactor[];
}
```

---

## 3. Healthcare / HealthTech Template

### 3.1 Template Definition

```yaml
id: healthcare
name: Healthcare / HealthTech
description: Template for healthcare technology products including telemedicine, health apps, and medical devices
parentTemplate: null

requiredCompliance:
  - HIPAA
  - HITECH
  - FDA (if medical device)
  - State-specific regulations
```

### 3.2 Additional Questions

```yaml
HC-001:
  question: "What type of healthcare product are you building?"
  type: single_choice
  options:
    - id: "telemedicine"
      label: "Telemedicine/Virtual Care Platform"
    - id: "ehr_emr"
      label: "EHR/EMR System"
    - id: "patient_engagement"
      label: "Patient Engagement App"
    - id: "clinical_decision"
      label: "Clinical Decision Support"
    - id: "medical_device"
      label: "Medical Device Software (SaMD)"
    - id: "health_wellness"
      label: "Health & Wellness (non-regulated)"
    - id: "pharma"
      label: "Pharmaceutical/Life Sciences"
    - id: "health_insurance"
      label: "Health Insurance/Payer"

HC-002:
  question: "Will your product handle Protected Health Information (PHI)?"
  type: single_choice
  options:
    - id: "yes_direct"
      label: "Yes, we create/store PHI directly"
    - id: "yes_indirect"
      label: "Yes, we receive PHI from covered entities"
    - id: "no_deidentified"
      label: "No, only de-identified data"
    - id: "no"
      label: "No PHI handling"

HC-003:
  question: "What is your relationship with covered entities?"
  type: single_choice
  visibilityRules:
    - condition: "HC-002 IN ['yes_direct', 'yes_indirect']"
  options:
    - id: "covered_entity"
      label: "We are a covered entity"
    - id: "business_associate"
      label: "We are a business associate"
    - id: "subcontractor"
      label: "We are a subcontractor to a BA"
    - id: "consumer_app"
      label: "Direct-to-consumer (no BAA required)"

HC-004:
  question: "Do you need healthcare interoperability standards?"
  type: multi_choice
  options:
    - id: "hl7_v2"
      label: "HL7 v2.x Messages"
    - id: "hl7_fhir"
      label: "HL7 FHIR R4"
    - id: "cda"
      label: "CDA Documents"
    - id: "dicom"
      label: "DICOM (Imaging)"
    - id: "x12"
      label: "X12 (Claims/Eligibility)"
    - id: "ncpdp"
      label: "NCPDP (Pharmacy)"
    - id: "none"
      label: "No interoperability needed"

HC-005:
  question: "Is your software classified as a medical device?"
  type: single_choice
  options:
    - id: "class_1"
      label: "Class I Medical Device"
    - id: "class_2"
      label: "Class II Medical Device (510k)"
    - id: "class_3"
      label: "Class III Medical Device (PMA)"
    - id: "not_device"
      label: "Not a medical device"
    - id: "unsure"
      label: "Unsure - need assessment"

HC-006:
  question: "What clinical workflows will your product support?"
  type: multi_choice
  options:
    - id: "appointment_scheduling"
      label: "Appointment Scheduling"
    - id: "patient_intake"
      label: "Patient Intake/Registration"
    - id: "clinical_documentation"
      label: "Clinical Documentation"
    - id: "order_entry"
      label: "Order Entry (CPOE)"
    - id: "medication_management"
      label: "Medication Management"
    - id: "lab_results"
      label: "Lab Results Review"
    - id: "imaging"
      label: "Imaging/Radiology"
    - id: "billing_coding"
      label: "Medical Billing/Coding"
    - id: "patient_communication"
      label: "Patient Communication"
    - id: "remote_monitoring"
      label: "Remote Patient Monitoring"
```

### 3.3 Terminology Map

```yaml
terminologyMap:
  customer: "patient"
  user: "provider/patient"
  account: "patient record"
  transaction: "encounter"
  order: "prescription/referral"
  admin: "practice administrator"
  support: "clinical support"
  dashboard: "clinical dashboard"
  report: "clinical report"
```

### 3.4 Output Customizations

```yaml
outputCustomizations:
  business_plan:
    emphasis:
      - regulatory_pathway
      - clinical_validation
      - reimbursement_strategy
    additionalSections:
      - clinical_evidence_plan
      - provider_adoption_strategy
  
  information_security_policy:
    additionalSections:
      - hipaa_security_rule
      - breach_notification
      - phi_handling_procedures
    requiredPolicies:
      - minimum_necessary_standard
      - access_audit_logging
      - encryption_requirements

  product_architecture:
    additionalConsiderations:
      - audit_trail_requirements
      - data_segmentation
      - emergency_access_procedures
```

### 3.5 Risk Factors

```yaml
riskFactors:
  - id: "PHI_BREACH"
    weight: 10
    description: "PHI data breach can result in significant fines and reputational damage"
    mitigations:
      - encryption_at_rest
      - encryption_in_transit
      - access_controls
      - audit_logging
  
  - id: "FDA_COMPLIANCE"
    weight: 8
    condition: "HC-005 IN ['class_1', 'class_2', 'class_3']"
    description: "FDA regulatory requirements for medical devices"
    mitigations:
      - design_controls
      - risk_management
      - quality_management_system
```

---

## 4. Financial Services / FinTech Template

### 4.1 Template Definition

```yaml
id: fintech
name: Financial Services / FinTech
description: Template for financial technology products including banking, payments, and investment platforms
parentTemplate: null

requiredCompliance:
  - PCI-DSS (if processing cards)
  - SOC 2 Type II
  - GLBA
  - State money transmitter licenses
  - BSA/AML
```

### 4.2 Additional Questions

```yaml
FIN-001:
  question: "What type of financial product are you building?"
  type: single_choice
  options:
    - id: "payments"
      label: "Payments/Money Transfer"
    - id: "lending"
      label: "Lending/Credit"
    - id: "banking"
      label: "Banking/Neobank"
    - id: "investment"
      label: "Investment/Wealth Management"
    - id: "insurance"
      label: "Insurance (InsurTech)"
    - id: "accounting"
      label: "Accounting/Bookkeeping"
    - id: "expense"
      label: "Expense Management"
    - id: "crypto"
      label: "Cryptocurrency/Blockchain"
    - id: "regtech"
      label: "RegTech/Compliance"

FIN-002:
  question: "Will you handle payment card data?"
  type: single_choice
  options:
    - id: "full_pan"
      label: "Yes, full card numbers (PCI Level 1-4)"
    - id: "tokenized"
      label: "Tokenized only (via Stripe/etc.)"
    - id: "no_cards"
      label: "No card data"

FIN-003:
  question: "What PCI compliance level do you need?"
  type: single_choice
  visibilityRules:
    - condition: "FIN-002 == 'full_pan'"
  options:
    - id: "level_1"
      label: "Level 1 (>6M transactions/year)"
    - id: "level_2"
      label: "Level 2 (1-6M transactions/year)"
    - id: "level_3"
      label: "Level 3 (20K-1M transactions/year)"
    - id: "level_4"
      label: "Level 4 (<20K transactions/year)"

FIN-004:
  question: "Do you need money transmitter licenses?"
  type: single_choice
  options:
    - id: "yes_federal"
      label: "Yes, federal and state licenses"
    - id: "yes_state"
      label: "Yes, state licenses only"
    - id: "no_partner"
      label: "No, partnering with licensed entity"
    - id: "no"
      label: "No, not applicable"

FIN-005:
  question: "What KYC/AML requirements do you have?"
  type: multi_choice
  options:
    - id: "kyc_basic"
      label: "Basic KYC (ID verification)"
    - id: "kyc_enhanced"
      label: "Enhanced Due Diligence (EDD)"
    - id: "aml_monitoring"
      label: "AML Transaction Monitoring"
    - id: "sanctions_screening"
      label: "Sanctions/PEP Screening"
    - id: "sar_filing"
      label: "SAR Filing Requirements"
    - id: "ctr_reporting"
      label: "CTR Reporting"
    - id: "none"
      label: "No KYC/AML requirements"

FIN-006:
  question: "What banking integrations do you need?"
  type: multi_choice
  options:
    - id: "plaid"
      label: "Plaid (Account Linking)"
    - id: "ach"
      label: "ACH Processing"
    - id: "wire"
      label: "Wire Transfers"
    - id: "rtp"
      label: "Real-Time Payments (RTP)"
    - id: "open_banking"
      label: "Open Banking APIs"
    - id: "core_banking"
      label: "Core Banking Integration"
    - id: "card_issuing"
      label: "Card Issuing"
    - id: "none"
      label: "No banking integrations"
```

### 4.3 Terminology Map

```yaml
terminologyMap:
  customer: "account holder"
  user: "customer/member"
  account: "financial account"
  transaction: "financial transaction"
  order: "transaction request"
  balance: "account balance"
  statement: "account statement"
  history: "transaction history"
```

### 4.4 Output Customizations

```yaml
outputCustomizations:
  business_plan:
    emphasis:
      - regulatory_strategy
      - banking_partnerships
      - revenue_model_compliance
    additionalSections:
      - licensing_roadmap
      - banking_partner_strategy
  
  information_security_policy:
    additionalSections:
      - pci_dss_controls
      - fraud_prevention
      - transaction_security
    requiredPolicies:
      - data_retention_financial
      - audit_trail_requirements
      - access_segregation

  api_documentation:
    additionalConsiderations:
      - idempotency_requirements
      - transaction_signatures
      - webhook_security
```

---

## 5. E-commerce / Retail Template

### 5.1 Template Definition

```yaml
id: ecommerce
name: E-commerce / Retail
description: Template for e-commerce platforms, marketplaces, and retail technology
parentTemplate: null

requiredCompliance:
  - PCI-DSS (payments)
  - CCPA/GDPR (customer data)
  - Consumer protection laws
```

### 5.2 Additional Questions

```yaml
ECOM-001:
  question: "What type of e-commerce model are you building?"
  type: single_choice
  options:
    - id: "direct_retail"
      label: "Direct-to-Consumer Retail"
    - id: "marketplace"
      label: "Multi-Vendor Marketplace"
    - id: "b2b_commerce"
      label: "B2B Commerce/Wholesale"
    - id: "subscription_box"
      label: "Subscription Box Service"
    - id: "dropship"
      label: "Dropshipping Platform"
    - id: "social_commerce"
      label: "Social Commerce"
    - id: "omnichannel"
      label: "Omnichannel Retail"

ECOM-002:
  question: "What is your expected product catalog size?"
  type: single_choice
  options:
    - id: "small"
      label: "Small (< 100 products)"
    - id: "medium"
      label: "Medium (100 - 1,000 products)"
    - id: "large"
      label: "Large (1,000 - 10,000 products)"
    - id: "massive"
      label: "Massive (10,000+ products)"
    - id: "infinite"
      label: "Infinite (marketplace/dropship)"

ECOM-003:
  question: "What inventory management features do you need?"
  type: multi_choice
  options:
    - id: "stock_tracking"
      label: "Stock Level Tracking"
    - id: "multi_location"
      label: "Multi-Location Inventory"
    - id: "backorder"
      label: "Backorder Management"
    - id: "bundle"
      label: "Product Bundles/Kits"
    - id: "variants"
      label: "Product Variants (size, color)"
    - id: "low_stock_alerts"
      label: "Low Stock Alerts"
    - id: "purchase_orders"
      label: "Purchase Order Management"
    - id: "none"
      label: "No inventory tracking"

ECOM-004:
  question: "What shipping and fulfillment features do you need?"
  type: multi_choice
  options:
    - id: "rate_shopping"
      label: "Real-time Rate Shopping"
    - id: "label_printing"
      label: "Shipping Label Generation"
    - id: "tracking"
      label: "Order Tracking"
    - id: "returns"
      label: "Returns Management"
    - id: "split_shipment"
      label: "Split Shipments"
    - id: "international"
      label: "International Shipping"
    - id: "local_delivery"
      label: "Local Delivery/Pickup"
    - id: "3pl"
      label: "3PL Integration"

ECOM-005:
  question: "What tax calculation requirements do you have?"
  type: single_choice
  options:
    - id: "us_only"
      label: "US Sales Tax Only"
    - id: "us_nexus"
      label: "US Multi-State Nexus"
    - id: "international"
      label: "International VAT/GST"
    - id: "automated"
      label: "Automated Tax Service (Avalara, TaxJar)"
    - id: "manual"
      label: "Manual Tax Configuration"

ECOM-006:
  question: "What promotional features do you need?"
  type: multi_choice
  options:
    - id: "discount_codes"
      label: "Discount/Promo Codes"
    - id: "flash_sales"
      label: "Flash Sales/Time-Limited"
    - id: "bogo"
      label: "Buy One Get One (BOGO)"
    - id: "tiered_pricing"
      label: "Tiered/Volume Pricing"
    - id: "loyalty"
      label: "Loyalty/Rewards Program"
    - id: "gift_cards"
      label: "Gift Cards"
    - id: "referral"
      label: "Referral Program"
    - id: "abandoned_cart"
      label: "Abandoned Cart Recovery"
```

### 5.3 Terminology Map

```yaml
terminologyMap:
  customer: "shopper/customer"
  user: "shopper"
  account: "customer account"
  transaction: "order"
  order: "purchase order"
  item: "product"
  catalog: "product catalog"
  cart: "shopping cart"
```

---

## 6. Education / EdTech Template

### 6.1 Template Definition

```yaml
id: education
name: Education / EdTech
description: Template for educational technology products including LMS, tutoring, and assessment platforms
parentTemplate: null

requiredCompliance:
  - FERPA (US student data)
  - COPPA (children under 13)
  - GDPR (EU students)
  - Accessibility (Section 508, WCAG)
```

### 6.2 Additional Questions

```yaml
EDU-001:
  question: "What type of educational product are you building?"
  type: single_choice
  options:
    - id: "lms"
      label: "Learning Management System (LMS)"
    - id: "tutoring"
      label: "Tutoring/Coaching Platform"
    - id: "assessment"
      label: "Assessment/Testing Platform"
    - id: "course_marketplace"
      label: "Course Marketplace"
    - id: "skill_training"
      label: "Skill Training/Upskilling"
    - id: "k12"
      label: "K-12 Educational App"
    - id: "higher_ed"
      label: "Higher Education Platform"
    - id: "corporate_training"
      label: "Corporate Training/L&D"
    - id: "language_learning"
      label: "Language Learning"

EDU-002:
  question: "What is your target age group?"
  type: multi_choice
  options:
    - id: "under_13"
      label: "Children under 13 (COPPA applies)"
    - id: "13_17"
      label: "Teens 13-17"
    - id: "18_24"
      label: "Young Adults 18-24"
    - id: "adult"
      label: "Adults 25+"
    - id: "all_ages"
      label: "All ages"

EDU-003:
  question: "What learning modalities do you support?"
  type: multi_choice
  options:
    - id: "video"
      label: "Video Lessons"
    - id: "live_class"
      label: "Live Virtual Classes"
    - id: "interactive"
      label: "Interactive Content"
    - id: "reading"
      label: "Reading Materials"
    - id: "quizzes"
      label: "Quizzes/Assessments"
    - id: "projects"
      label: "Projects/Assignments"
    - id: "discussion"
      label: "Discussion Forums"
    - id: "peer_review"
      label: "Peer Review"
    - id: "gamification"
      label: "Gamification/Badges"
    - id: "ai_tutor"
      label: "AI-Powered Tutoring"

EDU-004:
  question: "Do you need LTI (Learning Tools Interoperability) integration?"
  type: single_choice
  options:
    - id: "lti_1_1"
      label: "LTI 1.1"
    - id: "lti_1_3"
      label: "LTI 1.3/Advantage"
    - id: "both"
      label: "Both versions"
    - id: "no"
      label: "No LTI integration needed"

EDU-005:
  question: "What student data do you need to collect?"
  type: multi_choice
  options:
    - id: "basic_profile"
      label: "Basic Profile (name, email)"
    - id: "academic_records"
      label: "Academic Records/Grades"
    - id: "learning_progress"
      label: "Learning Progress/Analytics"
    - id: "assessment_results"
      label: "Assessment Results"
    - id: "behavior_data"
      label: "Behavioral/Engagement Data"
    - id: "parent_info"
      label: "Parent/Guardian Information"
    - id: "disability_accommodations"
      label: "Disability/Accommodation Info"

EDU-006:
  question: "What accessibility features are required?"
  type: multi_choice
  options:
    - id: "screen_reader"
      label: "Screen Reader Compatibility"
    - id: "captions"
      label: "Closed Captions/Subtitles"
    - id: "transcripts"
      label: "Audio Transcripts"
    - id: "alt_text"
      label: "Alt Text for Images"
    - id: "keyboard_nav"
      label: "Full Keyboard Navigation"
    - id: "high_contrast"
      label: "High Contrast Mode"
    - id: "text_resize"
      label: "Text Resizing"
    - id: "extended_time"
      label: "Extended Time for Assessments"
```

### 6.3 Terminology Map

```yaml
terminologyMap:
  customer: "institution/learner"
  user: "student/instructor"
  account: "learner profile"
  admin: "administrator/instructor"
  content: "course content"
  product: "course/program"
  subscription: "enrollment"
  transaction: "enrollment"
```

---

## 7. Real Estate / PropTech Template

### 7.1 Template Definition

```yaml
id: real_estate
name: Real Estate / PropTech
description: Template for real estate technology products including property management, listings, and investment platforms
parentTemplate: null

requiredCompliance:
  - Fair Housing Act
  - RESPA
  - State real estate regulations
  - CCPA/GDPR (personal data)
```

### 7.2 Additional Questions

```yaml
RE-001:
  question: "What type of real estate product are you building?"
  type: single_choice
  options:
    - id: "listings"
      label: "Property Listings/Search"
    - id: "property_mgmt"
      label: "Property Management"
    - id: "investment"
      label: "Real Estate Investment Platform"
    - id: "mortgage"
      label: "Mortgage/Lending"
    - id: "crm"
      label: "Real Estate CRM"
    - id: "valuation"
      label: "Property Valuation/AVM"
    - id: "construction"
      label: "Construction Management"
    - id: "smart_building"
      label: "Smart Building/IoT"

RE-002:
  question: "What property types does your product handle?"
  type: multi_choice
  options:
    - id: "residential_sale"
      label: "Residential (Sale)"
    - id: "residential_rental"
      label: "Residential (Rental)"
    - id: "commercial"
      label: "Commercial"
    - id: "industrial"
      label: "Industrial"
    - id: "land"
      label: "Land/Development"
    - id: "multifamily"
      label: "Multifamily"
    - id: "vacation"
      label: "Vacation/Short-term Rental"

RE-003:
  question: "What MLS integrations do you need?"
  type: multi_choice
  options:
    - id: "idx"
      label: "IDX Feed Integration"
    - id: "rets"
      label: "RETS Data Feed"
    - id: "reso"
      label: "RESO Web API"
    - id: "syndication"
      label: "Listing Syndication"
    - id: "none"
      label: "No MLS integration"

RE-004:
  question: "What transaction features do you need?"
  type: multi_choice
  options:
    - id: "document_mgmt"
      label: "Document Management"
    - id: "esignature"
      label: "E-Signature Integration"
    - id: "escrow"
      label: "Escrow Management"
    - id: "commission"
      label: "Commission Tracking"
    - id: "closing"
      label: "Closing Coordination"
    - id: "none"
      label: "No transaction features"
```

---

## 8. Professional Services Template

### 8.1 Template Definition

```yaml
id: professional_services
name: Professional Services
description: Template for professional services firms including consulting, legal, and accounting
parentTemplate: null

requiredCompliance:
  - Industry-specific regulations
  - Professional liability
  - Client confidentiality
```

### 8.2 Additional Questions

```yaml
PS-SERV-001:
  question: "What type of professional service firm is this for?"
  type: single_choice
  options:
    - id: "consulting"
      label: "Management Consulting"
    - id: "legal"
      label: "Legal Services"
    - id: "accounting"
      label: "Accounting/CPA Firm"
    - id: "marketing"
      label: "Marketing/Creative Agency"
    - id: "engineering"
      label: "Engineering/Architecture"
    - id: "hr"
      label: "HR/Staffing"
    - id: "it_services"
      label: "IT Services/MSP"
    - id: "other"
      label: "Other Professional Services"

PS-SERV-002:
  question: "What project/engagement management features do you need?"
  type: multi_choice
  options:
    - id: "time_tracking"
      label: "Time Tracking"
    - id: "resource_planning"
      label: "Resource Planning"
    - id: "project_mgmt"
      label: "Project Management"
    - id: "invoicing"
      label: "Invoicing/Billing"
    - id: "contracts"
      label: "Contract Management"
    - id: "document_mgmt"
      label: "Document Management"
    - id: "client_portal"
      label: "Client Portal"
    - id: "reporting"
      label: "Utilization Reporting"

PS-SERV-003:
  question: "What billing model do you use?"
  type: multi_choice
  options:
    - id: "hourly"
      label: "Hourly Billing"
    - id: "fixed_fee"
      label: "Fixed Fee Projects"
    - id: "retainer"
      label: "Retainer/Recurring"
    - id: "value_based"
      label: "Value-Based Pricing"
    - id: "contingency"
      label: "Contingency/Success Fee"
    - id: "hybrid"
      label: "Hybrid Models"
```

---

## 9. SaaS / Software Template

### 9.1 Template Definition

```yaml
id: saas
name: SaaS / Software
description: Default template for SaaS products and software platforms
parentTemplate: null

requiredCompliance:
  - SOC 2 (recommended)
  - GDPR/CCPA (customer data)
```

### 9.2 Additional Questions

```yaml
SAAS-001:
  question: "What type of SaaS product are you building?"
  type: single_choice
  options:
    - id: "horizontal"
      label: "Horizontal SaaS (cross-industry)"
    - id: "vertical"
      label: "Vertical SaaS (industry-specific)"
    - id: "infrastructure"
      label: "Infrastructure/Developer Tools"
    - id: "productivity"
      label: "Productivity/Collaboration"
    - id: "analytics"
      label: "Analytics/BI"
    - id: "marketing"
      label: "Marketing Technology"
    - id: "sales"
      label: "Sales/CRM"
    - id: "hr"
      label: "HR/People Operations"

SAAS-002:
  question: "What is your multi-tenancy architecture?"
  type: single_choice
  options:
    - id: "shared_db"
      label: "Shared Database (row-level isolation)"
    - id: "schema_per_tenant"
      label: "Schema per Tenant"
    - id: "db_per_tenant"
      label: "Database per Tenant"
    - id: "hybrid"
      label: "Hybrid (tiered by plan)"
    - id: "single_tenant"
      label: "Single Tenant (dedicated instances)"

SAAS-003:
  question: "What enterprise features do you need?"
  type: multi_choice
  options:
    - id: "sso"
      label: "Single Sign-On (SSO)"
    - id: "scim"
      label: "SCIM User Provisioning"
    - id: "rbac"
      label: "Role-Based Access Control"
    - id: "audit_logs"
      label: "Audit Logs"
    - id: "sla"
      label: "Custom SLAs"
    - id: "dedicated"
      label: "Dedicated Infrastructure"
    - id: "custom_contracts"
      label: "Custom Contracts"
    - id: "white_label"
      label: "White-Label Options"

SAAS-004:
  question: "What integration capabilities do you need?"
  type: multi_choice
  options:
    - id: "rest_api"
      label: "REST API"
    - id: "graphql"
      label: "GraphQL API"
    - id: "webhooks"
      label: "Webhooks"
    - id: "oauth"
      label: "OAuth Provider"
    - id: "zapier"
      label: "Zapier Integration"
    - id: "native_integrations"
      label: "Native Integrations"
    - id: "sdk"
      label: "Client SDKs"
    - id: "embedded"
      label: "Embedded/iFrame"
```

---

## 10. Template Inheritance

### 10.1 Template Hierarchy

```
base_template
├── healthcare
│   ├── telemedicine
│   ├── medical_device
│   └── health_wellness
├── fintech
│   ├── payments
│   ├── lending
│   └── crypto
├── ecommerce
│   ├── marketplace
│   └── subscription
├── education
│   ├── k12
│   └── corporate_training
└── saas (default)
```

### 10.2 Inheritance Rules

```typescript
function resolveTemplate(selectedIndustries: string[]): IndustryTemplate {
  // Start with base template
  let template = loadTemplate('base');
  
  // Apply primary industry template
  const primaryIndustry = selectedIndustries[0];
  template = mergeTemplates(template, loadTemplate(primaryIndustry));
  
  // Apply sub-industry if applicable
  const subIndustry = detectSubIndustry(primaryIndustry, responses);
  if (subIndustry) {
    template = mergeTemplates(template, loadTemplate(subIndustry));
  }
  
  // Merge compliance requirements from all selected industries
  for (const industry of selectedIndustries) {
    template.requiredCompliance = [
      ...new Set([
        ...template.requiredCompliance,
        ...loadTemplate(industry).requiredCompliance
      ])
    ];
  }
  
  return template;
}
```

---

## 11. Document Output Customization

### 11.1 Industry-Specific Sections

Each template can add, modify, or emphasize specific document sections:

```yaml
# Healthcare additions to Business Plan
healthcare_business_plan_additions:
  sections:
    - regulatory_strategy:
        title: "Regulatory Strategy"
        placement: after_market_analysis
        content:
          - fda_pathway
          - clinical_validation_plan
          - reimbursement_strategy
    
    - clinical_evidence:
        title: "Clinical Evidence Plan"
        placement: after_products_services
        content:
          - evidence_generation_strategy
          - clinical_trial_requirements
          - real_world_evidence

# FinTech additions to Information Security Policy
fintech_security_additions:
  sections:
    - fraud_prevention:
        title: "Fraud Prevention"
        placement: after_access_control
        content:
          - fraud_detection_systems
          - transaction_monitoring
          - velocity_checks
    
    - financial_controls:
        title: "Financial Controls"
        placement: after_data_protection
        content:
          - segregation_of_duties
          - reconciliation_procedures
          - audit_requirements
```

---

## 12. Template Application Engine

### 12.1 Application Flow

```typescript
class TemplateEngine {
  applyTemplate(
    sessionId: string,
    industries: string[],
    responses: Map<string, any>
  ): TemplateApplication {
    
    // 1. Resolve final template
    const template = this.resolveTemplate(industries);
    
    // 2. Add industry-specific questions
    const additionalQuestions = this.getAdditionalQuestions(template);
    
    // 3. Apply terminology mapping
    const terminologyMap = this.buildTerminologyMap(template);
    
    // 4. Configure output customizations
    const outputConfig = this.configureOutput(template);
    
    // 5. Set default values
    const defaults = this.applyDefaults(template, responses);
    
    // 6. Calculate risk factors
    const risks = this.calculateRisks(template, responses);
    
    return {
      template,
      additionalQuestions,
      terminologyMap,
      outputConfig,
      defaults,
      risks
    };
  }
}
```

---

*Industry templates ensure that the questionnaire and generated documents are tailored to each user's specific industry context, regulatory requirements, and terminology preferences.*
# Industry Templates

## Document Control
| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-01-25 | System | Initial industry templates |

---

## 1. Overview

Industry templates customize the questionnaire experience and document output based on the user's selected industry. Each template includes:

- **Industry-Specific Questions**: Additional questions relevant to that industry
- **Compliance Requirements**: Pre-configured regulatory requirements
- **Terminology Mapping**: Industry-specific language substitutions
- **Output Customization**: Modified document sections and emphasis
- **Validation Rules**: Industry-appropriate validation

---

## 2. Template Structure

```typescript
interface IndustryTemplate {
  id: string;
  name: string;
  description: string;
  parentTemplate?: string;  // For inheritance
  
  additionalQuestions: Question[];
  requiredCompliance: string[];
  terminologyMap: Map<string, string>;
  outputCustomizations: OutputCustomization[];
  validationRules: ValidationRule[];
  defaultValues: Map<string, any>;
  riskFactors: RiskFactor[];
}
```

---

## 3. Healthcare / HealthTech Template

### 3.1 Template Definition

```yaml
id: healthcare
name: Healthcare / HealthTech
description: Template for healthcare technology products including telemedicine, health apps, and medical devices
parentTemplate: null

requiredCompliance:
  - HIPAA
  - HITECH
  - FDA (if medical device)
  - State-specific regulations
```

### 3.2 Additional Questions

```yaml
HC-001:
  question: "What type of healthcare product are you building?"
  type: single_choice
  options:
    - id: "telemedicine"
      label: "Telemedicine/Virtual Care Platform"
    - id: "ehr_emr"
      label: "EHR/EMR System"
    - id: "patient_engagement"
      label: "Patient Engagement App"
    - id: "clinical_decision"
      label: "Clinical Decision Support"
    - id: "medical_device"
      label: "Medical Device Software (SaMD)"
    - id: "health_wellness"
      label: "Health & Wellness (non-regulated)"
    - id: "pharma"
      label: "Pharmaceutical/Life Sciences"
    - id: "health_insurance"
      label: "Health Insurance/Payer"

HC-002:
  question: "Will your product handle Protected Health Information (PHI)?"
  type: single_choice
  options:
    - id: "yes_direct"
      label: "Yes, we create/store PHI directly"
    - id: "yes_indirect"
      label: "Yes, we receive PHI from covered entities"
    - id: "no_deidentified"
      label: "No, only de-identified data"
    - id: "no"
      label: "No PHI handling"

HC-003:
  question: "What is your relationship with covered entities?"
  type: single_choice
  visibilityRules:
    - condition: "HC-002 IN ['yes_direct', 'yes_indirect']"
  options:
    - id: "covered_entity"
      label: "We are a covered entity"
    - id: "business_associate"
      label: "We are a business associate"
    - id: "subcontractor"
      label: "We are a subcontractor to a BA"
    - id: "consumer_app"
      label: "Direct-to-consumer (no BAA required)"

HC-004:
  question: "Do you need healthcare interoperability standards?"
  type: multi_choice
  options:
    - id: "hl7_v2"
      label: "HL7 v2.x Messages"
    - id: "hl7_fhir"
      label: "HL7 FHIR R4"
    - id: "cda"
      label: "CDA Documents"
    - id: "dicom"
      label: "DICOM (Imaging)"
    - id: "x12"
      label: "X12 (Claims/Eligibility)"
    - id: "ncpdp"
      label: "NCPDP (Pharmacy)"
    - id: "none"
      label: "No interoperability needed"

HC-005:
  question: "Is your software classified as a medical device?"
  type: single_choice
  options:
    - id: "class_1"
      label: "Class I Medical Device"
    - id: "class_2"
      label: "Class II Medical Device (510k)"
    - id: "class_3"
      label: "Class III Medical Device (PMA)"
    - id: "not_device"
      label: "Not a medical device"
    - id: "unsure"
      label: "Unsure - need assessment"

HC-006:
  question: "What clinical workflows will your product support?"
  type: multi_choice
  options:
    - id: "appointment_scheduling"
      label: "Appointment Scheduling"
    - id: "patient_intake"
      label: "Patient Intake/Registration"
    - id: "clinical_documentation"
      label: "Clinical Documentation"
    - id: "order_entry"
      label: "Order Entry (CPOE)"
    - id: "medication_management"
      label: "Medication Management"
    - id: "lab_results"
      label: "Lab Results Review"
    - id: "imaging"
      label: "Imaging/Radiology"
    - id: "billing_coding"
      label: "Medical Billing/Coding"
    - id: "patient_communication"
      label: "Patient Communication"
    - id: "remote_monitoring"
      label: "Remote Patient Monitoring"
```

### 3.3 Terminology Map

```yaml
terminologyMap:
  customer: "patient"
  user: "provider/patient"
  account: "patient record"
  transaction: "encounter"
  order: "prescription/referral"
  admin: "practice administrator"
  support: "clinical support"
  dashboard: "clinical dashboard"
  report: "clinical report"
```

### 3.4 Output Customizations

```yaml
outputCustomizations:
  business_plan:
    emphasis:
      - regulatory_pathway
      - clinical_validation
      - reimbursement_strategy
    additionalSections:
      - clinical_evidence_plan
      - provider_adoption_strategy
  
  information_security_policy:
    additionalSections:
      - hipaa_security_rule
      - breach_notification
      - phi_handling_procedures
    requiredPolicies:
      - minimum_necessary_standard
      - access_audit_logging
      - encryption_requirements

  product_architecture:
    additionalConsiderations:
      - audit_trail_requirements
      - data_segmentation
      - emergency_access_procedures
```

### 3.5 Risk Factors

```yaml
riskFactors:
  - id: "PHI_BREACH"
    weight: 10
    description: "PHI data breach can result in significant fines and reputational damage"
    mitigations:
      - encryption_at_rest
      - encryption_in_transit
      - access_controls
      - audit_logging
  
  - id: "FDA_COMPLIANCE"
    weight: 8
    condition: "HC-005 IN ['class_1', 'class_2', 'class_3']"
    description: "FDA regulatory requirements for medical devices"
    mitigations:
      - design_controls
      - risk_management
      - quality_management_system
```

---

## 4. Financial Services / FinTech Template

### 4.1 Template Definition

```yaml
id: fintech
name: Financial Services / FinTech
description: Template for financial technology products including banking, payments, and investment platforms
parentTemplate: null

requiredCompliance:
  - PCI-DSS (if processing cards)
  - SOC 2 Type II
  - GLBA
  - State money transmitter licenses
  - BSA/AML
```

### 4.2 Additional Questions

```yaml
FIN-001:
  question: "What type of financial product are you building?"
  type: single_choice
  options:
    - id: "payments"
      label: "Payments/Money Transfer"
    - id: "lending"
      label: "Lending/Credit"
    - id: "banking"
      label: "Banking/Neobank"
    - id: "investment"
      label: "Investment/Wealth Management"
    - id: "insurance"
      label: "Insurance (InsurTech)"
    - id: "accounting"
      label: "Accounting/Bookkeeping"
    - id: "expense"
      label: "Expense Management"
    - id: "crypto"
      label: "Cryptocurrency/Blockchain"
    - id: "regtech"
      label: "RegTech/Compliance"

FIN-002:
  question: "Will you handle payment card data?"
  type: single_choice
  options:
    - id: "full_pan"
      label: "Yes, full card numbers (PCI Level 1-4)"
    - id: "tokenized"
      label: "Tokenized only (via Stripe/etc.)"
    - id: "no_cards"
      label: "No card data"

FIN-003:
  question: "What PCI compliance level do you need?"
  type: single_choice
  visibilityRules:
    - condition: "FIN-002 == 'full_pan'"
  options:
    - id: "level_1"
      label: "Level 1 (>6M transactions/year)"
    - id: "level_2"
      label: "Level 2 (1-6M transactions/year)"
    - id: "level_3"
      label: "Level 3 (20K-1M transactions/year)"
    - id: "level_4"
      label: "Level 4 (<20K transactions/year)"

FIN-004:
  question: "Do you need money transmitter licenses?"
  type: single_choice
  options:
    - id: "yes_federal"
      label: "Yes, federal and state licenses"
    - id: "yes_state"
      label: "Yes, state licenses only"
    - id: "no_partner"
      label: "No, partnering with licensed entity"
    - id: "no"
      label: "No, not applicable"

FIN-005:
  question: "What KYC/AML requirements do you have?"
  type: multi_choice
  options:
    - id: "kyc_basic"
      label: "Basic KYC (ID verification)"
    - id: "kyc_enhanced"
      label: "Enhanced Due Diligence (EDD)"
    - id: "aml_monitoring"
      label: "AML Transaction Monitoring"
    - id: "sanctions_screening"
      label: "Sanctions/PEP Screening"
    - id: "sar_filing"
      label: "SAR Filing Requirements"
    - id: "ctr_reporting"
      label: "CTR Reporting"
    - id: "none"
      label: "No KYC/AML requirements"

FIN-006:
  question: "What banking integrations do you need?"
  type: multi_choice
  options:
    - id: "plaid"
      label: "Plaid (Account Linking)"
    - id: "ach"
      label: "ACH Processing"
    - id: "wire"
      label: "Wire Transfers"
    - id: "rtp"
      label: "Real-Time Payments (RTP)"
    - id: "open_banking"
      label: "Open Banking APIs"
    - id: "core_banking"
      label: "Core Banking Integration"
    - id: "card_issuing"
      label: "Card Issuing"
    - id: "none"
      label: "No banking integrations"
```

### 4.3 Terminology Map

```yaml
terminologyMap:
  customer: "account holder"
  user: "customer/member"
  account: "financial account"
  transaction: "financial transaction"
  order: "transaction request"
  balance: "account balance"
  statement: "account statement"
  history: "transaction history"
```

### 4.4 Output Customizations

```yaml
outputCustomizations:
  business_plan:
    emphasis:
      - regulatory_strategy
      - banking_partnerships
      - revenue_model_compliance
    additionalSections:
      - licensing_roadmap
      - banking_partner_strategy
  
  information_security_policy:
    additionalSections:
      - pci_dss_controls
      - fraud_prevention
      - transaction_security
    requiredPolicies:
      - data_retention_financial
      - audit_trail_requirements
      - access_segregation

  api_documentation:
    additionalConsiderations:
      - idempotency_requirements
      - transaction_signatures
      - webhook_security
```

---

## 5. E-commerce / Retail Template

### 5.1 Template Definition

```yaml
id: ecommerce
name: E-commerce / Retail
description: Template for e-commerce platforms, marketplaces, and retail technology
parentTemplate: null

requiredCompliance:
  - PCI-DSS (payments)
  - CCPA/GDPR (customer data)
  - Consumer protection laws
```

### 5.2 Additional Questions

```yaml
ECOM-001:
  question: "What type of e-commerce model are you building?"
  type: single_choice
  options:
    - id: "direct_retail"
      label: "Direct-to-Consumer Retail"
    - id: "marketplace"
      label: "Multi-Vendor Marketplace"
    - id: "b2b_commerce"
      label: "B2B Commerce/Wholesale"
    - id: "subscription_box"
      label: "Subscription Box Service"
    - id: "dropship"
      label: "Dropshipping Platform"
    - id: "social_commerce"
      label: "Social Commerce"
    - id: "omnichannel"
      label: "Omnichannel Retail"

ECOM-002:
  question: "What is your expected product catalog size?"
  type: single_choice
  options:
    - id: "small"
      label: "Small (< 100 products)"
    - id: "medium"
      label: "Medium (100 - 1,000 products)"
    - id: "large"
      label: "Large (1,000 - 10,000 products)"
    - id: "massive"
      label: "Massive (10,000+ products)"
    - id: "infinite"
      label: "Infinite (marketplace/dropship)"

ECOM-003:
  question: "What inventory management features do you need?"
  type: multi_choice
  options:
    - id: "stock_tracking"
      label: "Stock Level Tracking"
    - id: "multi_location"
      label: "Multi-Location Inventory"
    - id: "backorder"
      label: "Backorder Management"
    - id: "bundle"
      label: "Product Bundles/Kits"
    - id: "variants"
      label: "Product Variants (size, color)"
    - id: "low_stock_alerts"
      label: "Low Stock Alerts"
    - id: "purchase_orders"
      label: "Purchase Order Management"
    - id: "none"
      label: "No inventory tracking"

ECOM-004:
  question: "What shipping and fulfillment features do you need?"
  type: multi_choice
  options:
    - id: "rate_shopping"
      label: "Real-time Rate Shopping"
    - id: "label_printing"
      label: "Shipping Label Generation"
    - id: "tracking"
      label: "Order Tracking"
    - id: "returns"
      label: "Returns Management"
    - id: "split_shipment"
      label: "Split Shipments"
    - id: "international"
      label: "International Shipping"
    - id: "local_delivery"
      label: "Local Delivery/Pickup"
    - id: "3pl"
      label: "3PL Integration"

ECOM-005:
  question: "What tax calculation requirements do you have?"
  type: single_choice
  options:
    - id: "us_only"
      label: "US Sales Tax Only"
    - id: "us_nexus"
      label: "US Multi-State Nexus"
    - id: "international"
      label: "International VAT/GST"
    - id: "automated"
      label: "Automated Tax Service (Avalara, TaxJar)"
    - id: "manual"
      label: "Manual Tax Configuration"

ECOM-006:
  question: "What promotional features do you need?"
  type: multi_choice
  options:
    - id: "discount_codes"
      label: "Discount/Promo Codes"
    - id: "flash_sales"
      label: "Flash Sales/Time-Limited"
    - id: "bogo"
      label: "Buy One Get One (BOGO)"
    - id: "tiered_pricing"
      label: "Tiered/Volume Pricing"
    - id: "loyalty"
      label: "Loyalty/Rewards Program"
    - id: "gift_cards"
      label: "Gift Cards"
    - id: "referral"
      label: "Referral Program"
    - id: "abandoned_cart"
      label: "Abandoned Cart Recovery"
```

### 5.3 Terminology Map

```yaml
terminologyMap:
  customer: "shopper/customer"
  user: "shopper"
  account: "customer account"
  transaction: "order"
  order: "purchase order"
  item: "product"
  catalog: "product catalog"
  cart: "shopping cart"
```

---

## 6. Education / EdTech Template

### 6.1 Template Definition

```yaml
id: education
name: Education / EdTech
description: Template for educational technology products including LMS, tutoring, and assessment platforms
parentTemplate: null

requiredCompliance:
  - FERPA (US student data)
  - COPPA (children under 13)
  - GDPR (EU students)
  - Accessibility (Section 508, WCAG)
```

### 6.2 Additional Questions

```yaml
EDU-001:
  question: "What type of educational product are you building?"
  type: single_choice
  options:
    - id: "lms"
      label: "Learning Management System (LMS)"
    - id: "tutoring"
      label: "Tutoring/Coaching Platform"
    - id: "assessment"
      label: "Assessment/Testing Platform"
    - id: "course_marketplace"
      label: "Course Marketplace"
    - id: "skill_training"
      label: "Skill Training/Upskilling"
    - id: "k12"
      label: "K-12 Educational App"
    - id: "higher_ed"
      label: "Higher Education Platform"
    - id: "corporate_training"
      label: "Corporate Training/L&D"
    - id: "language_learning"
      label: "Language Learning"

EDU-002:
  question: "What is your target age group?"
  type: multi_choice
  options:
    - id: "under_13"
      label: "Children under 13 (COPPA applies)"
    - id: "13_17"
      label: "Teens 13-17"
    - id: "18_24"
      label: "Young Adults 18-24"
    - id: "adult"
      label: "Adults 25+"
    - id: "all_ages"
      label: "All ages"

EDU-003:
  question: "What learning modalities do you support?"
  type: multi_choice
  options:
    - id: "video"
      label: "Video Lessons"
    - id: "live_class"
      label: "Live Virtual Classes"
    - id: "interactive"
      label: "Interactive Content"
    - id: "reading"
      label: "Reading Materials"
    - id: "quizzes"
      label: "Quizzes/Assessments"
    - id: "projects"
      label: "Projects/Assignments"
    - id: "discussion"
      label: "Discussion Forums"
    - id: "peer_review"
      label: "Peer Review"
    - id: "gamification"
      label: "Gamification/Badges"
    - id: "ai_tutor"
      label: "AI-Powered Tutoring"

EDU-004:
  question: "Do you need LTI (Learning Tools Interoperability) integration?"
  type: single_choice
  options:
    - id: "lti_1_1"
      label: "LTI 1.1"
    - id: "lti_1_3"
      label: "LTI 1.3/Advantage"
    - id: "both"
      label: "Both versions"
    - id: "no"
      label: "No LTI integration needed"

EDU-005:
  question: "What student data do you need to collect?"
  type: multi_choice
  options:
    - id: "basic_profile"
      label: "Basic Profile (name, email)"
    - id: "academic_records"
      label: "Academic Records/Grades"
    - id: "learning_progress"
      label: "Learning Progress/Analytics"
    - id: "assessment_results"
      label: "Assessment Results"
    - id: "behavior_data"
      label: "Behavioral/Engagement Data"
    - id: "parent_info"
      label: "Parent/Guardian Information"
    - id: "disability_accommodations"
      label: "Disability/Accommodation Info"

EDU-006:
  question: "What accessibility features are required?"
  type: multi_choice
  options:
    - id: "screen_reader"
      label: "Screen Reader Compatibility"
    - id: "captions"
      label: "Closed Captions/Subtitles"
    - id: "transcripts"
      label: "Audio Transcripts"
    - id: "alt_text"
      label: "Alt Text for Images"
    - id: "keyboard_nav"
      label: "Full Keyboard Navigation"
    - id: "high_contrast"
      label: "High Contrast Mode"
    - id: "text_resize"
      label: "Text Resizing"
    - id: "extended_time"
      label: "Extended Time for Assessments"
```

### 6.3 Terminology Map

```yaml
terminologyMap:
  customer: "institution/learner"
  user: "student/instructor"
  account: "learner profile"
  admin: "administrator/instructor"
  content: "course content"
  product: "course/program"
  subscription: "enrollment"
  transaction: "enrollment"
```

---

## 7. Real Estate / PropTech Template

### 7.1 Template Definition

```yaml
id: real_estate
name: Real Estate / PropTech
description: Template for real estate technology products including property management, listings, and investment platforms
parentTemplate: null

requiredCompliance:
  - Fair Housing Act
  - RESPA
  - State real estate regulations
  - CCPA/GDPR (personal data)
```

### 7.2 Additional Questions

```yaml
RE-001:
  question: "What type of real estate product are you building?"
  type: single_choice
  options:
    - id: "listings"
      label: "Property Listings/Search"
    - id: "property_mgmt"
      label: "Property Management"
    - id: "investment"
      label: "Real Estate Investment Platform"
    - id: "mortgage"
      label: "Mortgage/Lending"
    - id: "crm"
      label: "Real Estate CRM"
    - id: "valuation"
      label: "Property Valuation/AVM"
    - id: "construction"
      label: "Construction Management"
    - id: "smart_building"
      label: "Smart Building/IoT"

RE-002:
  question: "What property types does your product handle?"
  type: multi_choice
  options:
    - id: "residential_sale"
      label: "Residential (Sale)"
    - id: "residential_rental"
      label: "Residential (Rental)"
    - id: "commercial"
      label: "Commercial"
    - id: "industrial"
      label: "Industrial"
    - id: "land"
      label: "Land/Development"
    - id: "multifamily"
      label: "Multifamily"
    - id: "vacation"
      label: "Vacation/Short-term Rental"

RE-003:
  question: "What MLS integrations do you need?"
  type: multi_choice
  options:
    - id: "idx"
      label: "IDX Feed Integration"
    - id: "rets"
      label: "RETS Data Feed"
    - id: "reso"
      label: "RESO Web API"
    - id: "syndication"
      label: "Listing Syndication"
    - id: "none"
      label: "No MLS integration"

RE-004:
  question: "What transaction features do you need?"
  type: multi_choice
  options:
    - id: "document_mgmt"
      label: "Document Management"
    - id: "esignature"
      label: "E-Signature Integration"
    - id: "escrow"
      label: "Escrow Management"
    - id: "commission"
      label: "Commission Tracking"
    - id: "closing"
      label: "Closing Coordination"
    - id: "none"
      label: "No transaction features"
```

---

## 8. Professional Services Template

### 8.1 Template Definition

```yaml
id: professional_services
name: Professional Services
description: Template for professional services firms including consulting, legal, and accounting
parentTemplate: null

requiredCompliance:
  - Industry-specific regulations
  - Professional liability
  - Client confidentiality
```

### 8.2 Additional Questions

```yaml
PS-SERV-001:
  question: "What type of professional service firm is this for?"
  type: single_choice
  options:
    - id: "consulting"
      label: "Management Consulting"
    - id: "legal"
      label: "Legal Services"
    - id: "accounting"
      label: "Accounting/CPA Firm"
    - id: "marketing"
      label: "Marketing/Creative Agency"
    - id: "engineering"
      label: "Engineering/Architecture"
    - id: "hr"
      label: "HR/Staffing"
    - id: "it_services"
      label: "IT Services/MSP"
    - id: "other"
      label: "Other Professional Services"

PS-SERV-002:
  question: "What project/engagement management features do you need?"
  type: multi_choice
  options:
    - id: "time_tracking"
      label: "Time Tracking"
    - id: "resource_planning"
      label: "Resource Planning"
    - id: "project_mgmt"
      label: "Project Management"
    - id: "invoicing"
      label: "Invoicing/Billing"
    - id: "contracts"
      label: "Contract Management"
    - id: "document_mgmt"
      label: "Document Management"
    - id: "client_portal"
      label: "Client Portal"
    - id: "reporting"
      label: "Utilization Reporting"

PS-SERV-003:
  question: "What billing model do you use?"
  type: multi_choice
  options:
    - id: "hourly"
      label: "Hourly Billing"
    - id: "fixed_fee"
      label: "Fixed Fee Projects"
    - id: "retainer"
      label: "Retainer/Recurring"
    - id: "value_based"
      label: "Value-Based Pricing"
    - id: "contingency"
      label: "Contingency/Success Fee"
    - id: "hybrid"
      label: "Hybrid Models"
```

---

## 9. SaaS / Software Template

### 9.1 Template Definition

```yaml
id: saas
name: SaaS / Software
description: Default template for SaaS products and software platforms
parentTemplate: null

requiredCompliance:
  - SOC 2 (recommended)
  - GDPR/CCPA (customer data)
```

### 9.2 Additional Questions

```yaml
SAAS-001:
  question: "What type of SaaS product are you building?"
  type: single_choice
  options:
    - id: "horizontal"
      label: "Horizontal SaaS (cross-industry)"
    - id: "vertical"
      label: "Vertical SaaS (industry-specific)"
    - id: "infrastructure"
      label: "Infrastructure/Developer Tools"
    - id: "productivity"
      label: "Productivity/Collaboration"
    - id: "analytics"
      label: "Analytics/BI"
    - id: "marketing"
      label: "Marketing Technology"
    - id: "sales"
      label: "Sales/CRM"
    - id: "hr"
      label: "HR/People Operations"

SAAS-002:
  question: "What is your multi-tenancy architecture?"
  type: single_choice
  options:
    - id: "shared_db"
      label: "Shared Database (row-level isolation)"
    - id: "schema_per_tenant"
      label: "Schema per Tenant"
    - id: "db_per_tenant"
      label: "Database per Tenant"
    - id: "hybrid"
      label: "Hybrid (tiered by plan)"
    - id: "single_tenant"
      label: "Single Tenant (dedicated instances)"

SAAS-003:
  question: "What enterprise features do you need?"
  type: multi_choice
  options:
    - id: "sso"
      label: "Single Sign-On (SSO)"
    - id: "scim"
      label: "SCIM User Provisioning"
    - id: "rbac"
      label: "Role-Based Access Control"
    - id: "audit_logs"
      label: "Audit Logs"
    - id: "sla"
      label: "Custom SLAs"
    - id: "dedicated"
      label: "Dedicated Infrastructure"
    - id: "custom_contracts"
      label: "Custom Contracts"
    - id: "white_label"
      label: "White-Label Options"

SAAS-004:
  question: "What integration capabilities do you need?"
  type: multi_choice
  options:
    - id: "rest_api"
      label: "REST API"
    - id: "graphql"
      label: "GraphQL API"
    - id: "webhooks"
      label: "Webhooks"
    - id: "oauth"
      label: "OAuth Provider"
    - id: "zapier"
      label: "Zapier Integration"
    - id: "native_integrations"
      label: "Native Integrations"
    - id: "sdk"
      label: "Client SDKs"
    - id: "embedded"
      label: "Embedded/iFrame"
```

---

## 10. Template Inheritance

### 10.1 Template Hierarchy

```
base_template
├── healthcare
│   ├── telemedicine
│   ├── medical_device
│   └── health_wellness
├── fintech
│   ├── payments
│   ├── lending
│   └── crypto
├── ecommerce
│   ├── marketplace
│   └── subscription
├── education
│   ├── k12
│   └── corporate_training
└── saas (default)
```

### 10.2 Inheritance Rules

```typescript
function resolveTemplate(selectedIndustries: string[]): IndustryTemplate {
  // Start with base template
  let template = loadTemplate('base');
  
  // Apply primary industry template
  const primaryIndustry = selectedIndustries[0];
  template = mergeTemplates(template, loadTemplate(primaryIndustry));
  
  // Apply sub-industry if applicable
  const subIndustry = detectSubIndustry(primaryIndustry, responses);
  if (subIndustry) {
    template = mergeTemplates(template, loadTemplate(subIndustry));
  }
  
  // Merge compliance requirements from all selected industries
  for (const industry of selectedIndustries) {
    template.requiredCompliance = [
      ...new Set([
        ...template.requiredCompliance,
        ...loadTemplate(industry).requiredCompliance
      ])
    ];
  }
  
  return template;
}
```

---

## 11. Document Output Customization

### 11.1 Industry-Specific Sections

Each template can add, modify, or emphasize specific document sections:

```yaml
# Healthcare additions to Business Plan
healthcare_business_plan_additions:
  sections:
    - regulatory_strategy:
        title: "Regulatory Strategy"
        placement: after_market_analysis
        content:
          - fda_pathway
          - clinical_validation_plan
          - reimbursement_strategy
    
    - clinical_evidence:
        title: "Clinical Evidence Plan"
        placement: after_products_services
        content:
          - evidence_generation_strategy
          - clinical_trial_requirements
          - real_world_evidence

# FinTech additions to Information Security Policy
fintech_security_additions:
  sections:
    - fraud_prevention:
        title: "Fraud Prevention"
        placement: after_access_control
        content:
          - fraud_detection_systems
          - transaction_monitoring
          - velocity_checks
    
    - financial_controls:
        title: "Financial Controls"
        placement: after_data_protection
        content:
          - segregation_of_duties
          - reconciliation_procedures
          - audit_requirements
```

---

## 12. Template Application Engine

### 12.1 Application Flow

```typescript
class TemplateEngine {
  applyTemplate(
    sessionId: string,
    industries: string[],
    responses: Map<string, any>
  ): TemplateApplication {
    
    // 1. Resolve final template
    const template = this.resolveTemplate(industries);
    
    // 2. Add industry-specific questions
    const additionalQuestions = this.getAdditionalQuestions(template);
    
    // 3. Apply terminology mapping
    const terminologyMap = this.buildTerminologyMap(template);
    
    // 4. Configure output customizations
    const outputConfig = this.configureOutput(template);
    
    // 5. Set default values
    const defaults = this.applyDefaults(template, responses);
    
    // 6. Calculate risk factors
    const risks = this.calculateRisks(template, responses);
    
    return {
      template,
      additionalQuestions,
      terminologyMap,
      outputConfig,
      defaults,
      risks
    };
  }
}
```

---

*Industry templates ensure that the questionnaire and generated documents are tailored to each user's specific industry context, regulatory requirements, and terminology preferences.*
