# Adaptive Client Questionnaire - Question Bank

## Document Control
| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-01-25 | System | Initial question bank |

---

## 1. Overview

This document contains the complete question bank for the Adaptive Client Questionnaire System. Questions are organized by domain and designed to gather comprehensive information for generating CTO, CFO, and BA documentation.

### 1.1 Question Structure

Each question follows this schema:

```json
{
  "id": "DOM-NNN",
  "domain": "string",
  "subdomain": "string",
  "type": "single_choice|multi_choice|text|number|date|scale|file_upload",
  "question": "string",
  "helpText": "string",
  "placeholder": "string",
  "options": [],
  "validation": {},
  "visibilityRules": [],
  "weight": 1-5,
  "outputMapping": ["document.section.field"]
}
```

### 1.2 Question Types

| Type | Description | Use Case |
|------|-------------|----------|
| `single_choice` | Radio buttons, one selection | Yes/No, categories |
| `multi_choice` | Checkboxes, multiple selections | Features, services |
| `text` | Free-form text input | Names, descriptions |
| `number` | Numeric input with validation | Revenue, counts |
| `date` | Date picker | Launch dates, milestones |
| `scale` | 1-10 or 1-5 rating | Priority, confidence |
| `file_upload` | Document attachment | Logos, existing docs |

---

## 2. Domain 1: Business Foundation (BF)

### 2.1 Company Identity

```yaml
BF-001:
  question: "What is your company or project name?"
  type: text
  validation:
    required: true
    minLength: 2
    maxLength: 100
  helpText: "Enter the legal or operating name of your business"
  outputMapping:
    - "business_plan.executive_summary.company_name"
    - "all_documents.header.company_name"

BF-002:
  question: "Do you have an existing business, or is this a new venture?"
  type: single_choice
  options:
    - id: "existing"
      label: "Existing business (operating)"
    - id: "startup"
      label: "New startup (pre-launch)"
    - id: "pivot"
      label: "Existing business pivoting to new product"
    - id: "internal"
      label: "Internal project within larger organization"
  outputMapping:
    - "business_plan.company_description.stage"

BF-003:
  question: "When was your company founded (or when do you plan to launch)?"
  type: date
  validation:
    required: true
  visibilityRules:
    - condition: "BF-002 != 'internal'"
  outputMapping:
    - "business_plan.company_description.founded_date"

BF-004:
  question: "What is your company's legal structure?"
  type: single_choice
  options:
    - id: "sole_prop"
      label: "Sole Proprietorship"
    - id: "llc"
      label: "Limited Liability Company (LLC)"
    - id: "c_corp"
      label: "C Corporation"
    - id: "s_corp"
      label: "S Corporation"
    - id: "partnership"
      label: "Partnership"
    - id: "nonprofit"
      label: "Non-Profit Organization"
    - id: "undecided"
      label: "Not yet decided"
  helpText: "Select the legal entity type for your business"
  outputMapping:
    - "business_plan.company_description.legal_structure"

BF-005:
  question: "Where is your company headquartered?"
  type: text
  placeholder: "City, State/Province, Country"
  validation:
    required: true
  outputMapping:
    - "business_plan.company_description.location"

BF-006:
  question: "Describe your business in one sentence (elevator pitch)."
  type: text
  validation:
    required: true
    minLength: 20
    maxLength: 200
  helpText: "This will be used in your executive summary"
  outputMapping:
    - "business_plan.executive_summary.elevator_pitch"

BF-007:
  question: "Provide a detailed description of what your business does."
  type: text
  validation:
    required: true
    minLength: 100
    maxLength: 2000
  helpText: "Explain your products/services, target market, and value proposition"
  outputMapping:
    - "business_plan.company_description.overview"
    - "brd.business_overview"
```

### 2.2 Mission and Vision

```yaml
BF-008:
  question: "What is your company's mission statement?"
  type: text
  validation:
    minLength: 20
    maxLength: 500
  helpText: "Your mission defines WHY your company exists"
  placeholder: "To [action] for [audience] by [method]..."
  outputMapping:
    - "business_plan.company_description.mission"

BF-009:
  question: "What is your company's vision statement?"
  type: text
  validation:
    minLength: 20
    maxLength: 500
  helpText: "Your vision describes WHERE you want to be in 5-10 years"
  outputMapping:
    - "business_plan.company_description.vision"

BF-010:
  question: "What are your company's core values?"
  type: multi_choice
  options:
    - id: "innovation"
      label: "Innovation & Creativity"
    - id: "integrity"
      label: "Integrity & Transparency"
    - id: "customer_focus"
      label: "Customer Focus"
    - id: "quality"
      label: "Quality Excellence"
    - id: "collaboration"
      label: "Collaboration & Teamwork"
    - id: "sustainability"
      label: "Sustainability & Social Responsibility"
    - id: "agility"
      label: "Agility & Adaptability"
    - id: "diversity"
      label: "Diversity & Inclusion"
  validation:
    minSelections: 2
    maxSelections: 5
  outputMapping:
    - "business_plan.company_description.values"
```

---

## 3. Domain 2: Product/Service Definition (PS)

### 3.1 Core Offering

```yaml
PS-001:
  question: "What type of product/service are you building?"
  type: single_choice
  options:
    - id: "software_saas"
      label: "Software as a Service (SaaS)"
    - id: "mobile_app"
      label: "Mobile Application"
    - id: "marketplace"
      label: "Marketplace/Platform"
    - id: "ecommerce"
      label: "E-commerce Store"
    - id: "api_service"
      label: "API/Developer Service"
    - id: "hardware_iot"
      label: "Hardware/IoT Product"
    - id: "consulting"
      label: "Consulting/Professional Services"
    - id: "content_media"
      label: "Content/Media Platform"
    - id: "other"
      label: "Other"
  outputMapping:
    - "product_architecture.product_type"
    - "technology_strategy.product_category"

PS-002:
  question: "If other, please describe your product type:"
  type: text
  visibilityRules:
    - condition: "PS-001 == 'other'"
      action: "show"
  validation:
    required: true
    minLength: 10

PS-003:
  question: "What is the name of your product/service?"
  type: text
  validation:
    required: true
    maxLength: 50
  outputMapping:
    - "product_architecture.product_name"
    - "api_documentation.service_name"

PS-004:
  question: "Describe the core problem your product solves."
  type: text
  validation:
    required: true
    minLength: 50
    maxLength: 1000
  helpText: "Focus on the pain point your customers experience"
  outputMapping:
    - "business_plan.products_services.problem_statement"
    - "brd.problem_definition"

PS-005:
  question: "How does your product solve this problem?"
  type: text
  validation:
    required: true
    minLength: 50
    maxLength: 1000
  helpText: "Describe your unique solution approach"
  outputMapping:
    - "business_plan.products_services.solution"
    - "brd.proposed_solution"

PS-006:
  question: "What makes your solution unique compared to alternatives?"
  type: text
  validation:
    required: true
    minLength: 50
    maxLength: 1000
  helpText: "Your competitive advantage or unique value proposition"
  outputMapping:
    - "business_plan.products_services.unique_value_proposition"
    - "business_case.competitive_advantage"
```

### 3.2 Features and Functionality

```yaml
PS-007:
  question: "List the top 5 features of your product."
  type: text
  validation:
    required: true
    minLength: 50
  helpText: "Describe each feature briefly (one per line)"
  outputMapping:
    - "frd.core_features"
    - "product_architecture.feature_list"

PS-008:
  question: "Which features are must-have for your MVP (Minimum Viable Product)?"
  type: multi_choice
  options:
    - id: "user_auth"
      label: "User Registration/Authentication"
    - id: "user_profiles"
      label: "User Profiles/Accounts"
    - id: "payments"
      label: "Payment Processing"
    - id: "subscriptions"
      label: "Subscription Management"
    - id: "search"
      label: "Search Functionality"
    - id: "messaging"
      label: "Messaging/Chat"
    - id: "notifications"
      label: "Push Notifications"
    - id: "analytics"
      label: "Analytics Dashboard"
    - id: "admin_panel"
      label: "Admin Panel"
    - id: "reporting"
      label: "Reporting/Exports"
    - id: "integrations"
      label: "Third-party Integrations"
    - id: "file_upload"
      label: "File Upload/Storage"
  validation:
    minSelections: 1
  outputMapping:
    - "frd.mvp_features"
    - "user_stories.mvp_scope"

PS-009:
  question: "What is the current development stage of your product?"
  type: single_choice
  options:
    - id: "idea"
      label: "Idea/Concept Stage"
    - id: "design"
      label: "Design/Prototyping"
    - id: "development"
      label: "In Development"
    - id: "beta"
      label: "Beta/Testing"
    - id: "launched"
      label: "Launched/Live"
    - id: "scaling"
      label: "Scaling/Growth Phase"
  outputMapping:
    - "technology_roadmap.current_stage"
    - "business_plan.current_status"

PS-010:
  question: "Do you have an existing product that needs to be rebuilt or enhanced?"
  type: single_choice
  options:
    - id: "greenfield"
      label: "No, this is a completely new build"
    - id: "rebuild"
      label: "Yes, rebuilding from scratch"
    - id: "enhance"
      label: "Yes, enhancing existing product"
    - id: "migrate"
      label: "Yes, migrating to new platform"
  outputMapping:
    - "technology_strategy.project_type"
```

---

## 4. Domain 3: Target Market (TM)

### 4.1 Customer Segments

```yaml
TM-001:
  question: "Who is your primary target customer?"
  type: single_choice
  options:
    - id: "b2c"
      label: "Individual Consumers (B2C)"
    - id: "b2b_smb"
      label: "Small/Medium Businesses (B2B SMB)"
    - id: "b2b_enterprise"
      label: "Enterprise Companies (B2B Enterprise)"
    - id: "b2b2c"
      label: "Businesses serving consumers (B2B2C)"
    - id: "b2g"
      label: "Government/Public Sector (B2G)"
    - id: "mixed"
      label: "Multiple segments"
  outputMapping:
    - "business_plan.market_analysis.target_segment"
    - "stakeholder_analysis.primary_users"

TM-002:
  question: "Describe your ideal customer profile (ICP)."
  type: text
  validation:
    required: true
    minLength: 100
    maxLength: 1500
  helpText: "Include demographics, job titles, company size, pain points"
  outputMapping:
    - "business_plan.market_analysis.customer_profile"
    - "user_stories.persona_definition"

TM-003:
  question: "What industries does your product serve?"
  type: multi_choice
  options:
    - id: "technology"
      label: "Technology/Software"
    - id: "healthcare"
      label: "Healthcare/Medical"
    - id: "finance"
      label: "Finance/Banking"
    - id: "retail"
      label: "Retail/E-commerce"
    - id: "education"
      label: "Education/EdTech"
    - id: "manufacturing"
      label: "Manufacturing"
    - id: "real_estate"
      label: "Real Estate/PropTech"
    - id: "hospitality"
      label: "Hospitality/Travel"
    - id: "professional_services"
      label: "Professional Services"
    - id: "nonprofit"
      label: "Non-Profit/NGO"
    - id: "government"
      label: "Government/Public Sector"
    - id: "all_industries"
      label: "Industry Agnostic"
  validation:
    minSelections: 1
  outputMapping:
    - "business_plan.market_analysis.target_industries"
    - "industry_templates.applicable_industries"

TM-004:
  question: "What is the geographic scope of your target market?"
  type: multi_choice
  options:
    - id: "local"
      label: "Local (City/Region)"
    - id: "national"
      label: "National (Single Country)"
    - id: "north_america"
      label: "North America"
    - id: "europe"
      label: "Europe"
    - id: "apac"
      label: "Asia-Pacific"
    - id: "latam"
      label: "Latin America"
    - id: "global"
      label: "Global"
  validation:
    minSelections: 1
  outputMapping:
    - "business_plan.market_analysis.geographic_scope"
    - "data_protection_policy.applicable_regions"

TM-005:
  question: "What is the estimated size of your target market (TAM)?"
  type: single_choice
  options:
    - id: "under_1m"
      label: "Under $1 million"
    - id: "1m_10m"
      label: "$1 million - $10 million"
    - id: "10m_100m"
      label: "$10 million - $100 million"
    - id: "100m_1b"
      label: "$100 million - $1 billion"
    - id: "over_1b"
      label: "Over $1 billion"
    - id: "unknown"
      label: "Unknown/Need research"
  helpText: "Total Addressable Market - the entire revenue opportunity"
  outputMapping:
    - "business_plan.market_analysis.tam"
    - "business_case.market_size"
```

### 4.2 Market Position

```yaml
TM-006:
  question: "Who are your top 3 competitors?"
  type: text
  validation:
    minLength: 10
  helpText: "List competitor names, one per line"
  outputMapping:
    - "business_plan.competitive_analysis.competitors"

TM-007:
  question: "How do you differentiate from these competitors?"
  type: text
  validation:
    minLength: 50
    maxLength: 1000
  outputMapping:
    - "business_plan.competitive_analysis.differentiation"
    - "business_case.competitive_advantage"

TM-008:
  question: "What is your market entry strategy?"
  type: single_choice
  options:
    - id: "price_leader"
      label: "Price Leadership (lowest cost)"
    - id: "differentiation"
      label: "Differentiation (unique features)"
    - id: "niche"
      label: "Niche Focus (specific segment)"
    - id: "first_mover"
      label: "First Mover (new market)"
    - id: "fast_follower"
      label: "Fast Follower (improve on existing)"
  outputMapping:
    - "business_plan.marketing_strategy.market_entry"
```

---

## 5. Domain 4: Technology Requirements (TR)

### 5.1 Platform Requirements

```yaml
TR-001:
  question: "Which platforms do you need to support?"
  type: multi_choice
  options:
    - id: "web_responsive"
      label: "Web Application (Responsive)"
    - id: "ios_native"
      label: "iOS Native App"
    - id: "android_native"
      label: "Android Native App"
    - id: "desktop_windows"
      label: "Windows Desktop"
    - id: "desktop_mac"
      label: "macOS Desktop"
    - id: "api_only"
      label: "API/Backend Only"
    - id: "embedded"
      label: "Embedded/IoT"
  validation:
    required: true
    minSelections: 1
  outputMapping:
    - "product_architecture.target_platforms"
    - "technology_strategy.platform_requirements"

TR-002:
  question: "Do you have a preference for technology stack?"
  type: single_choice
  options:
    - id: "no_preference"
      label: "No preference (recommend best fit)"
    - id: "javascript"
      label: "JavaScript/TypeScript ecosystem"
    - id: "python"
      label: "Python ecosystem"
    - id: "dotnet"
      label: ".NET/C# ecosystem"
    - id: "java"
      label: "Java/Kotlin ecosystem"
    - id: "existing"
      label: "Must integrate with existing stack"
  outputMapping:
    - "technology_strategy.stack_preference"
    - "product_architecture.technology_constraints"

TR-003:
  question: "If you have an existing tech stack, please describe it:"
  type: text
  visibilityRules:
    - condition: "TR-002 == 'existing'"
      action: "show"
  validation:
    required: true
    minLength: 20
  outputMapping:
    - "product_architecture.existing_stack"

TR-004:
  question: "What are your hosting/infrastructure preferences?"
  type: single_choice
  options:
    - id: "no_preference"
      label: "No preference (recommend)"
    - id: "aws"
      label: "Amazon Web Services (AWS)"
    - id: "azure"
      label: "Microsoft Azure"
    - id: "gcp"
      label: "Google Cloud Platform"
    - id: "on_premise"
      label: "On-Premise/Self-Hosted"
    - id: "hybrid"
      label: "Hybrid Cloud"
  outputMapping:
    - "product_architecture.infrastructure"
    - "disaster_recovery.cloud_provider"

TR-005:
  question: "What level of scalability do you anticipate needing?"
  type: single_choice
  options:
    - id: "small"
      label: "Small (under 1,000 users)"
    - id: "medium"
      label: "Medium (1,000 - 10,000 users)"
    - id: "large"
      label: "Large (10,000 - 100,000 users)"
    - id: "enterprise"
      label: "Enterprise (100,000+ users)"
    - id: "massive"
      label: "Massive Scale (millions of users)"
  outputMapping:
    - "product_architecture.scalability_requirements"
    - "technology_roadmap.scale_targets"
```

### 5.2 Integration Requirements

```yaml
TR-006:
  question: "What third-party integrations do you need?"
  type: multi_choice
  options:
    - id: "payment_stripe"
      label: "Stripe (Payments)"
    - id: "payment_paypal"
      label: "PayPal (Payments)"
    - id: "auth_social"
      label: "Social Login (Google, Facebook, Apple)"
    - id: "email_sendgrid"
      label: "SendGrid/Email Service"
    - id: "sms_twilio"
      label: "Twilio (SMS/Voice)"
    - id: "analytics_ga"
      label: "Google Analytics"
    - id: "analytics_mixpanel"
      label: "Mixpanel/Amplitude"
    - id: "crm_salesforce"
      label: "Salesforce CRM"
    - id: "crm_hubspot"
      label: "HubSpot CRM"
    - id: "storage_s3"
      label: "AWS S3/Cloud Storage"
    - id: "maps_google"
      label: "Google Maps"
    - id: "ai_openai"
      label: "OpenAI/AI Services"
  outputMapping:
    - "product_architecture.integrations"
    - "api_documentation.external_services"

TR-007:
  question: "Do you need to provide an API for external developers?"
  type: single_choice
  options:
    - id: "no"
      label: "No, internal use only"
    - id: "yes_private"
      label: "Yes, for partners only"
    - id: "yes_public"
      label: "Yes, public API"
  outputMapping:
    - "api_documentation.api_type"
    - "technology_strategy.api_strategy"

TR-008:
  question: "What data will your system need to import/export?"
  type: multi_choice
  options:
    - id: "csv"
      label: "CSV/Excel Files"
    - id: "pdf"
      label: "PDF Documents"
    - id: "images"
      label: "Images/Media"
    - id: "json"
      label: "JSON Data"
    - id: "xml"
      label: "XML Data"
    - id: "database"
      label: "Direct Database Connection"
    - id: "api"
      label: "API Integration"
    - id: "none"
      label: "No import/export needed"
  outputMapping:
    - "frd.data_import_export"
    - "api_documentation.data_formats"
```

---

## 6. Domain 5: Security & Compliance (SC)

### 6.1 Security Requirements

```yaml
SC-001:
  question: "What type of data will your system handle?"
  type: multi_choice
  options:
    - id: "pii"
      label: "Personal Identifiable Information (PII)"
    - id: "phi"
      label: "Protected Health Information (PHI)"
    - id: "financial"
      label: "Financial/Payment Data"
    - id: "children"
      label: "Children's Data (COPPA)"
    - id: "business"
      label: "Business/Corporate Data"
    - id: "public"
      label: "Public/Non-sensitive Data Only"
  validation:
    required: true
    minSelections: 1
  outputMapping:
    - "information_security_policy.data_classification"
    - "data_protection_policy.data_types"

SC-002:
  question: "What compliance standards must you meet?"
  type: multi_choice
  options:
    - id: "gdpr"
      label: "GDPR (EU Privacy)"
    - id: "ccpa"
      label: "CCPA (California Privacy)"
    - id: "hipaa"
      label: "HIPAA (Healthcare)"
    - id: "pci"
      label: "PCI-DSS (Payment Card)"
    - id: "soc2"
      label: "SOC 2 (Service Organization)"
    - id: "iso27001"
      label: "ISO 27001 (Information Security)"
    - id: "fedramp"
      label: "FedRAMP (US Government)"
    - id: "none"
      label: "No specific requirements"
  outputMapping:
    - "information_security_policy.compliance_requirements"
    - "vendor_management.compliance_requirements"

SC-003:
  question: "What authentication methods do you need?"
  type: multi_choice
  options:
    - id: "email_password"
      label: "Email/Password"
    - id: "social"
      label: "Social Login (Google, Facebook, etc.)"
    - id: "sso"
      label: "Single Sign-On (SSO)"
    - id: "mfa"
      label: "Multi-Factor Authentication (MFA)"
    - id: "biometric"
      label: "Biometric (Face ID, Touch ID)"
    - id: "passwordless"
      label: "Passwordless (Magic Links)"
    - id: "api_keys"
      label: "API Keys (for developers)"
  validation:
    required: true
    minSelections: 1
  outputMapping:
    - "product_architecture.authentication"
    - "information_security_policy.access_control"

SC-004:
  question: "What is your data retention requirement?"
  type: single_choice
  options:
    - id: "minimal"
      label: "Minimal (delete when no longer needed)"
    - id: "1_year"
      label: "1 year"
    - id: "3_years"
      label: "3 years"
    - id: "7_years"
      label: "7 years (financial compliance)"
    - id: "indefinite"
      label: "Indefinite retention"
    - id: "user_controlled"
      label: "User-controlled deletion"
  outputMapping:
    - "data_protection_policy.retention_policy"
    - "disaster_recovery.backup_retention"
```

---

## 7. Domain 6: Business Model (BM)

### 7.1 Revenue Model

```yaml
BM-001:
  question: "What is your primary revenue model?"
  type: single_choice
  options:
    - id: "subscription"
      label: "Subscription (recurring)"
    - id: "one_time"
      label: "One-time Purchase"
    - id: "freemium"
      label: "Freemium (free + premium)"
    - id: "usage"
      label: "Usage-based/Pay-per-use"
    - id: "marketplace"
      label: "Marketplace Commission"
    - id: "advertising"
      label: "Advertising"
    - id: "licensing"
      label: "Licensing"
    - id: "hybrid"
      label: "Hybrid/Multiple models"
  outputMapping:
    - "business_plan.financial_projections.revenue_model"
    - "frd.billing_requirements"

BM-002:
  question: "What pricing tiers do you plan to offer?"
  type: multi_choice
  visibilityRules:
    - condition: "BM-001 IN ['subscription', 'freemium']"
      action: "show"
  options:
    - id: "free"
      label: "Free Tier"
    - id: "starter"
      label: "Starter/Basic"
    - id: "professional"
      label: "Professional/Pro"
    - id: "business"
      label: "Business/Team"
    - id: "enterprise"
      label: "Enterprise (custom pricing)"
  outputMapping:
    - "business_plan.financial_projections.pricing_tiers"
    - "frd.subscription_tiers"

BM-003:
  question: "What is your target price point?"
  type: single_choice
  options:
    - id: "under_10"
      label: "Under $10/month"
    - id: "10_50"
      label: "$10 - $50/month"
    - id: "50_200"
      label: "$50 - $200/month"
    - id: "200_500"
      label: "$200 - $500/month"
    - id: "500_plus"
      label: "$500+/month"
    - id: "custom"
      label: "Custom/Enterprise pricing"
  outputMapping:
    - "business_plan.financial_projections.price_point"

BM-004:
  question: "What is your expected customer acquisition cost (CAC)?"
  type: single_choice
  options:
    - id: "under_50"
      label: "Under $50"
    - id: "50_200"
      label: "$50 - $200"
    - id: "200_500"
      label: "$200 - $500"
    - id: "500_1000"
      label: "$500 - $1,000"
    - id: "over_1000"
      label: "Over $1,000"
    - id: "unknown"
      label: "Unknown"
  outputMapping:
    - "business_plan.financial_projections.cac"
    - "business_case.unit_economics"

BM-005:
  question: "What is your target customer lifetime value (LTV)?"
  type: single_choice
  options:
    - id: "under_100"
      label: "Under $100"
    - id: "100_500"
      label: "$100 - $500"
    - id: "500_2000"
      label: "$500 - $2,000"
    - id: "2000_10000"
      label: "$2,000 - $10,000"
    - id: "over_10000"
      label: "Over $10,000"
    - id: "unknown"
      label: "Unknown"
  outputMapping:
    - "business_plan.financial_projections.ltv"
    - "business_case.unit_economics"
```

### 7.2 Financial Status

```yaml
BM-006:
  question: "What is your current funding status?"
  type: single_choice
  options:
    - id: "bootstrapped"
      label: "Bootstrapped (self-funded)"
    - id: "friends_family"
      label: "Friends & Family Round"
    - id: "pre_seed"
      label: "Pre-Seed"
    - id: "seed"
      label: "Seed Round"
    - id: "series_a"
      label: "Series A"
    - id: "series_b_plus"
      label: "Series B+"
    - id: "profitable"
      label: "Profitable/No funding needed"
  outputMapping:
    - "business_plan.financial_projections.funding_stage"

BM-007:
  question: "What is your monthly budget for this project?"
  type: single_choice
  options:
    - id: "under_5k"
      label: "Under $5,000/month"
    - id: "5k_15k"
      label: "$5,000 - $15,000/month"
    - id: "15k_50k"
      label: "$15,000 - $50,000/month"
    - id: "50k_100k"
      label: "$50,000 - $100,000/month"
    - id: "over_100k"
      label: "Over $100,000/month"
    - id: "flexible"
      label: "Flexible based on requirements"
  outputMapping:
    - "business_plan.financial_projections.budget"
    - "technology_roadmap.budget_constraints"

BM-008:
  question: "Do you have existing revenue?"
  type: single_choice
  options:
    - id: "no_revenue"
      label: "No revenue yet"
    - id: "under_10k"
      label: "Under $10K MRR"
    - id: "10k_50k"
      label: "$10K - $50K MRR"
    - id: "50k_100k"
      label: "$50K - $100K MRR"
    - id: "over_100k"
      label: "Over $100K MRR"
  outputMapping:
    - "business_plan.financial_projections.current_revenue"
```

---

## 8. Domain 7: Team & Operations (TO)

### 8.1 Team Structure

```yaml
TO-001:
  question: "What is your current team size?"
  type: single_choice
  options:
    - id: "solo"
      label: "Solo founder"
    - id: "2_5"
      label: "2-5 people"
    - id: "6_15"
      label: "6-15 people"
    - id: "16_50"
      label: "16-50 people"
    - id: "50_plus"
      label: "50+ people"
  outputMapping:
    - "business_plan.organization.team_size"
    - "engineering_handbook.team_structure"

TO-002:
  question: "Do you have in-house technical capabilities?"
  type: single_choice
  options:
    - id: "no_tech"
      label: "No technical team"
    - id: "limited"
      label: "Limited (1-2 developers)"
    - id: "small"
      label: "Small tech team (3-5 developers)"
    - id: "full"
      label: "Full engineering team (6+)"
    - id: "outsourced"
      label: "Fully outsourced development"
  outputMapping:
    - "technology_strategy.team_capabilities"
    - "engineering_handbook.staffing_model"

TO-003:
  question: "What technical roles do you need to hire?"
  type: multi_choice
  visibilityRules:
    - condition: "TO-002 IN ['no_tech', 'limited', 'outsourced']"
      action: "show"
  options:
    - id: "cto"
      label: "CTO/Technical Lead"
    - id: "backend"
      label: "Backend Developers"
    - id: "frontend"
      label: "Frontend Developers"
    - id: "mobile"
      label: "Mobile Developers"
    - id: "fullstack"
      label: "Full-Stack Developers"
    - id: "devops"
      label: "DevOps/Infrastructure"
    - id: "qa"
      label: "QA/Testing"
    - id: "design"
      label: "UI/UX Designers"
    - id: "product"
      label: "Product Manager"
  outputMapping:
    - "business_plan.organization.hiring_needs"
    - "onboarding_procedures.roles_needed"

TO-004:
  question: "What is your preferred development approach?"
  type: single_choice
  options:
    - id: "in_house"
      label: "In-house development"
    - id: "agency"
      label: "Development agency"
    - id: "freelancers"
      label: "Freelancers/Contractors"
    - id: "hybrid"
      label: "Hybrid (in-house + contractors)"
    - id: "no_code"
      label: "No-code/Low-code solutions"
  outputMapping:
    - "technology_strategy.development_approach"
    - "vendor_management.engagement_model"
```

---

## 9. Domain 8: Timeline & Milestones (TL)

### 9.1 Project Timeline

```yaml
TL-001:
  question: "When do you need the MVP ready?"
  type: single_choice
  options:
    - id: "asap"
      label: "As soon as possible"
    - id: "1_3_months"
      label: "1-3 months"
    - id: "3_6_months"
      label: "3-6 months"
    - id: "6_12_months"
      label: "6-12 months"
    - id: "over_12_months"
      label: "Over 12 months"
    - id: "flexible"
      label: "Flexible/No deadline"
  outputMapping:
    - "technology_roadmap.mvp_timeline"
    - "business_plan.milestones.mvp_target"

TL-002:
  question: "Do you have any hard deadlines?"
  type: single_choice
  options:
    - id: "no"
      label: "No hard deadlines"
    - id: "investor"
      label: "Yes, investor/funding deadline"
    - id: "launch"
      label: "Yes, planned launch event"
    - id: "contract"
      label: "Yes, contractual obligation"
    - id: "seasonal"
      label: "Yes, seasonal opportunity"
  outputMapping:
    - "technology_roadmap.deadline_type"
    - "business_plan.milestones.deadline"

TL-003:
  question: "If you have a hard deadline, what is the date?"
  type: date
  visibilityRules:
    - condition: "TL-002 != 'no'"
      action: "show"
  validation:
    required: true
  outputMapping:
    - "technology_roadmap.hard_deadline"
    - "business_plan.milestones.deadline_date"

TL-004:
  question: "What are your key milestones for the next 12 months?"
  type: text
  validation:
    minLength: 50
  helpText: "List major milestones (e.g., MVP launch, beta testing, first customer)"
  outputMapping:
    - "technology_roadmap.milestones"
    - "business_plan.milestones.year_one"
```

---

## 10. Domain 9: Support & Maintenance (SM)

### 10.1 Support Requirements

```yaml
SM-001:
  question: "What level of customer support do you need to provide?"
  type: single_choice
  options:
    - id: "self_service"
      label: "Self-service only (documentation, FAQ)"
    - id: "email"
      label: "Email support (business hours)"
    - id: "chat"
      label: "Live chat support"
    - id: "phone"
      label: "Phone support"
    - id: "24_7"
      label: "24/7 support"
    - id: "dedicated"
      label: "Dedicated account management"
  outputMapping:
    - "frd.support_requirements"
    - "business_plan.operations.support_model"

SM-002:
  question: "What SLA (Service Level Agreement) do you need to offer?"
  type: single_choice
  options:
    - id: "none"
      label: "No formal SLA"
    - id: "99"
      label: "99% uptime (3.65 days downtime/year)"
    - id: "99_9"
      label: "99.9% uptime (8.76 hours downtime/year)"
    - id: "99_99"
      label: "99.99% uptime (52.6 minutes downtime/year)"
    - id: "99_999"
      label: "99.999% uptime (5.26 minutes downtime/year)"
  outputMapping:
    - "disaster_recovery.sla_target"
    - "product_architecture.availability_requirements"

SM-003:
  question: "Do you need multi-language support?"
  type: single_choice
  options:
    - id: "english_only"
      label: "English only"
    - id: "2_5_languages"
      label: "2-5 languages"
    - id: "6_plus"
      label: "6+ languages"
    - id: "future"
      label: "Not now, but planned for future"
  outputMapping:
    - "frd.localization_requirements"
    - "product_architecture.i18n_requirements"

SM-004:
  question: "What accessibility requirements do you have?"
  type: single_choice
  options:
    - id: "basic"
      label: "Basic accessibility"
    - id: "wcag_a"
      label: "WCAG 2.1 Level A"
    - id: "wcag_aa"
      label: "WCAG 2.1 Level AA"
    - id: "wcag_aaa"
      label: "WCAG 2.1 Level AAA"
    - id: "section_508"
      label: "Section 508 Compliance"
  outputMapping:
    - "frd.accessibility_requirements"
    - "wireframes.accessibility_standards"
```

---

## 11. Supplementary Questions

### 11.1 Additional Context

```yaml
SUP-001:
  question: "Is there anything else we should know about your project?"
  type: text
  validation:
    maxLength: 2000
  helpText: "Any additional context, constraints, or requirements"
  outputMapping:
    - "brd.additional_notes"

SUP-002:
  question: "Do you have any existing documentation we should review?"
  type: single_choice
  options:
    - id: "none"
      label: "No existing documentation"
    - id: "pitch_deck"
      label: "Pitch deck available"
    - id: "business_plan"
      label: "Business plan available"
    - id: "technical_specs"
      label: "Technical specifications available"
    - id: "multiple"
      label: "Multiple documents available"
  outputMapping:
    - "brd.existing_documentation"

SUP-003:
  question: "Would you like to upload any existing documents?"
  type: file_upload
  visibilityRules:
    - condition: "SUP-002 != 'none'"
      action: "show"
  validation:
    allowedTypes: ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx"]
    maxSize: "10MB"
  outputMapping:
    - "brd.uploaded_documents"

SUP-004:
  question: "How did you hear about us?"
  type: single_choice
  options:
    - id: "search"
      label: "Search engine"
    - id: "referral"
      label: "Referral"
    - id: "social"
      label: "Social media"
    - id: "content"
      label: "Blog/Content"
    - id: "other"
      label: "Other"
  outputMapping:
    - "crm.lead_source"
```

---

## 12. Question Weights and Scoring

### 12.1 Weight Distribution

| Domain | Weight | Reasoning |
|--------|--------|-----------|
| Business Foundation | 5 | Core identity, required for all outputs |
| Product/Service | 5 | Essential for technical planning |
| Target Market | 4 | Critical for business planning |
| Technology | 4 | Required for architecture decisions |
| Security | 4 | Compliance and risk assessment |
| Business Model | 4 | Revenue and financial planning |
| Team | 3 | Operational planning |
| Timeline | 3 | Project management |
| Support | 3 | Operational requirements |

### 12.2 Completion Scoring

```javascript
calculateCompletionScore(responses) {
  let totalWeight = 0;
  let answeredWeight = 0;
  
  for (const question of questionBank) {
    if (isQuestionVisible(question, responses)) {
      totalWeight += question.weight;
      if (responses[question.id]) {
        answeredWeight += question.weight;
      }
    }
  }
  
  return (answeredWeight / totalWeight) * 100;
}
```

---

## 13. Question Statistics

| Metric | Value |
|--------|-------|
| Total Questions | 78 |
| Required Questions | 32 |
| Conditional Questions | 12 |
| Single Choice | 45 |
| Multi Choice | 18 |
| Text Input | 12 |
| Date Input | 2 |
| File Upload | 1 |

---

## Appendix A: Output Mapping Reference

Each question maps to specific sections in output documents:

| Document | Sections Mapped |
|----------|-----------------|
| Business Plan | Executive Summary, Company Description, Market Analysis, Financial Projections |
| BRD | Business Overview, Problem Definition, Proposed Solution |
| FRD | Core Features, MVP Features, Support Requirements |
| Product Architecture | Platforms, Integrations, Authentication, Infrastructure |
| Technology Strategy | Stack Preference, Product Category, Team Capabilities |
| Technology Roadmap | Current Stage, Milestones, Budget Constraints |
| Information Security Policy | Data Classification, Compliance, Access Control |
| Data Protection Policy | Data Types, Retention Policy, Applicable Regions |
| Disaster Recovery | Cloud Provider, Backup Retention, SLA Target |

---

*This question bank is designed to be comprehensive while remaining adaptive. Questions are shown or hidden based on previous responses, ensuring users only see relevant questions.*
# Adaptive Client Questionnaire - Question Bank

## Document Control
| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-01-25 | System | Initial question bank |

---

## 1. Overview

This document contains the complete question bank for the Adaptive Client Questionnaire System. Questions are organized by domain and designed to gather comprehensive information for generating CTO, CFO, and BA documentation.

### 1.1 Question Structure

Each question follows this schema:

```json
{
  "id": "DOM-NNN",
  "domain": "string",
  "subdomain": "string",
  "type": "single_choice|multi_choice|text|number|date|scale|file_upload",
  "question": "string",
  "helpText": "string",
  "placeholder": "string",
  "options": [],
  "validation": {},
  "visibilityRules": [],
  "weight": 1-5,
  "outputMapping": ["document.section.field"]
}
```

### 1.2 Question Types

| Type | Description | Use Case |
|------|-------------|----------|
| `single_choice` | Radio buttons, one selection | Yes/No, categories |
| `multi_choice` | Checkboxes, multiple selections | Features, services |
| `text` | Free-form text input | Names, descriptions |
| `number` | Numeric input with validation | Revenue, counts |
| `date` | Date picker | Launch dates, milestones |
| `scale` | 1-10 or 1-5 rating | Priority, confidence |
| `file_upload` | Document attachment | Logos, existing docs |

---

## 2. Domain 1: Business Foundation (BF)

### 2.1 Company Identity

```yaml
BF-001:
  question: "What is your company or project name?"
  type: text
  validation:
    required: true
    minLength: 2
    maxLength: 100
  helpText: "Enter the legal or operating name of your business"
  outputMapping:
    - "business_plan.executive_summary.company_name"
    - "all_documents.header.company_name"

BF-002:
  question: "Do you have an existing business, or is this a new venture?"
  type: single_choice
  options:
    - id: "existing"
      label: "Existing business (operating)"
    - id: "startup"
      label: "New startup (pre-launch)"
    - id: "pivot"
      label: "Existing business pivoting to new product"
    - id: "internal"
      label: "Internal project within larger organization"
  outputMapping:
    - "business_plan.company_description.stage"

BF-003:
  question: "When was your company founded (or when do you plan to launch)?"
  type: date
  validation:
    required: true
  visibilityRules:
    - condition: "BF-002 != 'internal'"
  outputMapping:
    - "business_plan.company_description.founded_date"

BF-004:
  question: "What is your company's legal structure?"
  type: single_choice
  options:
    - id: "sole_prop"
      label: "Sole Proprietorship"
    - id: "llc"
      label: "Limited Liability Company (LLC)"
    - id: "c_corp"
      label: "C Corporation"
    - id: "s_corp"
      label: "S Corporation"
    - id: "partnership"
      label: "Partnership"
    - id: "nonprofit"
      label: "Non-Profit Organization"
    - id: "undecided"
      label: "Not yet decided"
  helpText: "Select the legal entity type for your business"
  outputMapping:
    - "business_plan.company_description.legal_structure"

BF-005:
  question: "Where is your company headquartered?"
  type: text
  placeholder: "City, State/Province, Country"
  validation:
    required: true
  outputMapping:
    - "business_plan.company_description.location"

BF-006:
  question: "Describe your business in one sentence (elevator pitch)."
  type: text
  validation:
    required: true
    minLength: 20
    maxLength: 200
  helpText: "This will be used in your executive summary"
  outputMapping:
    - "business_plan.executive_summary.elevator_pitch"

BF-007:
  question: "Provide a detailed description of what your business does."
  type: text
  validation:
    required: true
    minLength: 100
    maxLength: 2000
  helpText: "Explain your products/services, target market, and value proposition"
  outputMapping:
    - "business_plan.company_description.overview"
    - "brd.business_overview"
```

### 2.2 Mission and Vision

```yaml
BF-008:
  question: "What is your company's mission statement?"
  type: text
  validation:
    minLength: 20
    maxLength: 500
  helpText: "Your mission defines WHY your company exists"
  placeholder: "To [action] for [audience] by [method]..."
  outputMapping:
    - "business_plan.company_description.mission"

BF-009:
  question: "What is your company's vision statement?"
  type: text
  validation:
    minLength: 20
    maxLength: 500
  helpText: "Your vision describes WHERE you want to be in 5-10 years"
  outputMapping:
    - "business_plan.company_description.vision"

BF-010:
  question: "What are your company's core values?"
  type: multi_choice
  options:
    - id: "innovation"
      label: "Innovation & Creativity"
    - id: "integrity"
      label: "Integrity & Transparency"
    - id: "customer_focus"
      label: "Customer Focus"
    - id: "quality"
      label: "Quality Excellence"
    - id: "collaboration"
      label: "Collaboration & Teamwork"
    - id: "sustainability"
      label: "Sustainability & Social Responsibility"
    - id: "agility"
      label: "Agility & Adaptability"
    - id: "diversity"
      label: "Diversity & Inclusion"
  validation:
    minSelections: 2
    maxSelections: 5
  outputMapping:
    - "business_plan.company_description.values"
```

---

## 3. Domain 2: Product/Service Definition (PS)

### 3.1 Core Offering

```yaml
PS-001:
  question: "What type of product/service are you building?"
  type: single_choice
  options:
    - id: "software_saas"
      label: "Software as a Service (SaaS)"
    - id: "mobile_app"
      label: "Mobile Application"
    - id: "marketplace"
      label: "Marketplace/Platform"
    - id: "ecommerce"
      label: "E-commerce Store"
    - id: "api_service"
      label: "API/Developer Service"
    - id: "hardware_iot"
      label: "Hardware/IoT Product"
    - id: "consulting"
      label: "Consulting/Professional Services"
    - id: "content_media"
      label: "Content/Media Platform"
    - id: "other"
      label: "Other"
  outputMapping:
    - "product_architecture.product_type"
    - "technology_strategy.product_category"

PS-002:
  question: "If other, please describe your product type:"
  type: text
  visibilityRules:
    - condition: "PS-001 == 'other'"
      action: "show"
  validation:
    required: true
    minLength: 10

PS-003:
  question: "What is the name of your product/service?"
  type: text
  validation:
    required: true
    maxLength: 50
  outputMapping:
    - "product_architecture.product_name"
    - "api_documentation.service_name"

PS-004:
  question: "Describe the core problem your product solves."
  type: text
  validation:
    required: true
    minLength: 50
    maxLength: 1000
  helpText: "Focus on the pain point your customers experience"
  outputMapping:
    - "business_plan.products_services.problem_statement"
    - "brd.problem_definition"

PS-005:
  question: "How does your product solve this problem?"
  type: text
  validation:
    required: true
    minLength: 50
    maxLength: 1000
  helpText: "Describe your unique solution approach"
  outputMapping:
    - "business_plan.products_services.solution"
    - "brd.proposed_solution"

PS-006:
  question: "What makes your solution unique compared to alternatives?"
  type: text
  validation:
    required: true
    minLength: 50
    maxLength: 1000
  helpText: "Your competitive advantage or unique value proposition"
  outputMapping:
    - "business_plan.products_services.unique_value_proposition"
    - "business_case.competitive_advantage"
```

### 3.2 Features and Functionality

```yaml
PS-007:
  question: "List the top 5 features of your product."
  type: text
  validation:
    required: true
    minLength: 50
  helpText: "Describe each feature briefly (one per line)"
  outputMapping:
    - "frd.core_features"
    - "product_architecture.feature_list"

PS-008:
  question: "Which features are must-have for your MVP (Minimum Viable Product)?"
  type: multi_choice
  options:
    - id: "user_auth"
      label: "User Registration/Authentication"
    - id: "user_profiles"
      label: "User Profiles/Accounts"
    - id: "payments"
      label: "Payment Processing"
    - id: "subscriptions"
      label: "Subscription Management"
    - id: "search"
      label: "Search Functionality"
    - id: "messaging"
      label: "Messaging/Chat"
    - id: "notifications"
      label: "Push Notifications"
    - id: "analytics"
      label: "Analytics Dashboard"
    - id: "admin_panel"
      label: "Admin Panel"
    - id: "reporting"
      label: "Reporting/Exports"
    - id: "integrations"
      label: "Third-party Integrations"
    - id: "file_upload"
      label: "File Upload/Storage"
  validation:
    minSelections: 1
  outputMapping:
    - "frd.mvp_features"
    - "user_stories.mvp_scope"

PS-009:
  question: "What is the current development stage of your product?"
  type: single_choice
  options:
    - id: "idea"
      label: "Idea/Concept Stage"
    - id: "design"
      label: "Design/Prototyping"
    - id: "development"
      label: "In Development"
    - id: "beta"
      label: "Beta/Testing"
    - id: "launched"
      label: "Launched/Live"
    - id: "scaling"
      label: "Scaling/Growth Phase"
  outputMapping:
    - "technology_roadmap.current_stage"
    - "business_plan.current_status"

PS-010:
  question: "Do you have an existing product that needs to be rebuilt or enhanced?"
  type: single_choice
  options:
    - id: "greenfield"
      label: "No, this is a completely new build"
    - id: "rebuild"
      label: "Yes, rebuilding from scratch"
    - id: "enhance"
      label: "Yes, enhancing existing product"
    - id: "migrate"
      label: "Yes, migrating to new platform"
  outputMapping:
    - "technology_strategy.project_type"
```

---

## 4. Domain 3: Target Market (TM)

### 4.1 Customer Segments

```yaml
TM-001:
  question: "Who is your primary target customer?"
  type: single_choice
  options:
    - id: "b2c"
      label: "Individual Consumers (B2C)"
    - id: "b2b_smb"
      label: "Small/Medium Businesses (B2B SMB)"
    - id: "b2b_enterprise"
      label: "Enterprise Companies (B2B Enterprise)"
    - id: "b2b2c"
      label: "Businesses serving consumers (B2B2C)"
    - id: "b2g"
      label: "Government/Public Sector (B2G)"
    - id: "mixed"
      label: "Multiple segments"
  outputMapping:
    - "business_plan.market_analysis.target_segment"
    - "stakeholder_analysis.primary_users"

TM-002:
  question: "Describe your ideal customer profile (ICP)."
  type: text
  validation:
    required: true
    minLength: 100
    maxLength: 1500
  helpText: "Include demographics, job titles, company size, pain points"
  outputMapping:
    - "business_plan.market_analysis.customer_profile"
    - "user_stories.persona_definition"

TM-003:
  question: "What industries does your product serve?"
  type: multi_choice
  options:
    - id: "technology"
      label: "Technology/Software"
    - id: "healthcare"
      label: "Healthcare/Medical"
    - id: "finance"
      label: "Finance/Banking"
    - id: "retail"
      label: "Retail/E-commerce"
    - id: "education"
      label: "Education/EdTech"
    - id: "manufacturing"
      label: "Manufacturing"
    - id: "real_estate"
      label: "Real Estate/PropTech"
    - id: "hospitality"
      label: "Hospitality/Travel"
    - id: "professional_services"
      label: "Professional Services"
    - id: "nonprofit"
      label: "Non-Profit/NGO"
    - id: "government"
      label: "Government/Public Sector"
    - id: "all_industries"
      label: "Industry Agnostic"
  validation:
    minSelections: 1
  outputMapping:
    - "business_plan.market_analysis.target_industries"
    - "industry_templates.applicable_industries"

TM-004:
  question: "What is the geographic scope of your target market?"
  type: multi_choice
  options:
    - id: "local"
      label: "Local (City/Region)"
    - id: "national"
      label: "National (Single Country)"
    - id: "north_america"
      label: "North America"
    - id: "europe"
      label: "Europe"
    - id: "apac"
      label: "Asia-Pacific"
    - id: "latam"
      label: "Latin America"
    - id: "global"
      label: "Global"
  validation:
    minSelections: 1
  outputMapping:
    - "business_plan.market_analysis.geographic_scope"
    - "data_protection_policy.applicable_regions"

TM-005:
  question: "What is the estimated size of your target market (TAM)?"
  type: single_choice
  options:
    - id: "under_1m"
      label: "Under $1 million"
    - id: "1m_10m"
      label: "$1 million - $10 million"
    - id: "10m_100m"
      label: "$10 million - $100 million"
    - id: "100m_1b"
      label: "$100 million - $1 billion"
    - id: "over_1b"
      label: "Over $1 billion"
    - id: "unknown"
      label: "Unknown/Need research"
  helpText: "Total Addressable Market - the entire revenue opportunity"
  outputMapping:
    - "business_plan.market_analysis.tam"
    - "business_case.market_size"
```

### 4.2 Market Position

```yaml
TM-006:
  question: "Who are your top 3 competitors?"
  type: text
  validation:
    minLength: 10
  helpText: "List competitor names, one per line"
  outputMapping:
    - "business_plan.competitive_analysis.competitors"

TM-007:
  question: "How do you differentiate from these competitors?"
  type: text
  validation:
    minLength: 50
    maxLength: 1000
  outputMapping:
    - "business_plan.competitive_analysis.differentiation"
    - "business_case.competitive_advantage"

TM-008:
  question: "What is your market entry strategy?"
  type: single_choice
  options:
    - id: "price_leader"
      label: "Price Leadership (lowest cost)"
    - id: "differentiation"
      label: "Differentiation (unique features)"
    - id: "niche"
      label: "Niche Focus (specific segment)"
    - id: "first_mover"
      label: "First Mover (new market)"
    - id: "fast_follower"
      label: "Fast Follower (improve on existing)"
  outputMapping:
    - "business_plan.marketing_strategy.market_entry"
```

---

## 5. Domain 4: Technology Requirements (TR)

### 5.1 Platform Requirements

```yaml
TR-001:
  question: "Which platforms do you need to support?"
  type: multi_choice
  options:
    - id: "web_responsive"
      label: "Web Application (Responsive)"
    - id: "ios_native"
      label: "iOS Native App"
    - id: "android_native"
      label: "Android Native App"
    - id: "desktop_windows"
      label: "Windows Desktop"
    - id: "desktop_mac"
      label: "macOS Desktop"
    - id: "api_only"
      label: "API/Backend Only"
    - id: "embedded"
      label: "Embedded/IoT"
  validation:
    required: true
    minSelections: 1
  outputMapping:
    - "product_architecture.target_platforms"
    - "technology_strategy.platform_requirements"

TR-002:
  question: "Do you have a preference for technology stack?"
  type: single_choice
  options:
    - id: "no_preference"
      label: "No preference (recommend best fit)"
    - id: "javascript"
      label: "JavaScript/TypeScript ecosystem"
    - id: "python"
      label: "Python ecosystem"
    - id: "dotnet"
      label: ".NET/C# ecosystem"
    - id: "java"
      label: "Java/Kotlin ecosystem"
    - id: "existing"
      label: "Must integrate with existing stack"
  outputMapping:
    - "technology_strategy.stack_preference"
    - "product_architecture.technology_constraints"

TR-003:
  question: "If you have an existing tech stack, please describe it:"
  type: text
  visibilityRules:
    - condition: "TR-002 == 'existing'"
      action: "show"
  validation:
    required: true
    minLength: 20
  outputMapping:
    - "product_architecture.existing_stack"

TR-004:
  question: "What are your hosting/infrastructure preferences?"
  type: single_choice
  options:
    - id: "no_preference"
      label: "No preference (recommend)"
    - id: "aws"
      label: "Amazon Web Services (AWS)"
    - id: "azure"
      label: "Microsoft Azure"
    - id: "gcp"
      label: "Google Cloud Platform"
    - id: "on_premise"
      label: "On-Premise/Self-Hosted"
    - id: "hybrid"
      label: "Hybrid Cloud"
  outputMapping:
    - "product_architecture.infrastructure"
    - "disaster_recovery.cloud_provider"

TR-005:
  question: "What level of scalability do you anticipate needing?"
  type: single_choice
  options:
    - id: "small"
      label: "Small (under 1,000 users)"
    - id: "medium"
      label: "Medium (1,000 - 10,000 users)"
    - id: "large"
      label: "Large (10,000 - 100,000 users)"
    - id: "enterprise"
      label: "Enterprise (100,000+ users)"
    - id: "massive"
      label: "Massive Scale (millions of users)"
  outputMapping:
    - "product_architecture.scalability_requirements"
    - "technology_roadmap.scale_targets"
```

### 5.2 Integration Requirements

```yaml
TR-006:
  question: "What third-party integrations do you need?"
  type: multi_choice
  options:
    - id: "payment_stripe"
      label: "Stripe (Payments)"
    - id: "payment_paypal"
      label: "PayPal (Payments)"
    - id: "auth_social"
      label: "Social Login (Google, Facebook, Apple)"
    - id: "email_sendgrid"
      label: "SendGrid/Email Service"
    - id: "sms_twilio"
      label: "Twilio (SMS/Voice)"
    - id: "analytics_ga"
      label: "Google Analytics"
    - id: "analytics_mixpanel"
      label: "Mixpanel/Amplitude"
    - id: "crm_salesforce"
      label: "Salesforce CRM"
    - id: "crm_hubspot"
      label: "HubSpot CRM"
    - id: "storage_s3"
      label: "AWS S3/Cloud Storage"
    - id: "maps_google"
      label: "Google Maps"
    - id: "ai_openai"
      label: "OpenAI/AI Services"
  outputMapping:
    - "product_architecture.integrations"
    - "api_documentation.external_services"

TR-007:
  question: "Do you need to provide an API for external developers?"
  type: single_choice
  options:
    - id: "no"
      label: "No, internal use only"
    - id: "yes_private"
      label: "Yes, for partners only"
    - id: "yes_public"
      label: "Yes, public API"
  outputMapping:
    - "api_documentation.api_type"
    - "technology_strategy.api_strategy"

TR-008:
  question: "What data will your system need to import/export?"
  type: multi_choice
  options:
    - id: "csv"
      label: "CSV/Excel Files"
    - id: "pdf"
      label: "PDF Documents"
    - id: "images"
      label: "Images/Media"
    - id: "json"
      label: "JSON Data"
    - id: "xml"
      label: "XML Data"
    - id: "database"
      label: "Direct Database Connection"
    - id: "api"
      label: "API Integration"
    - id: "none"
      label: "No import/export needed"
  outputMapping:
    - "frd.data_import_export"
    - "api_documentation.data_formats"
```

---

## 6. Domain 5: Security & Compliance (SC)

### 6.1 Security Requirements

```yaml
SC-001:
  question: "What type of data will your system handle?"
  type: multi_choice
  options:
    - id: "pii"
      label: "Personal Identifiable Information (PII)"
    - id: "phi"
      label: "Protected Health Information (PHI)"
    - id: "financial"
      label: "Financial/Payment Data"
    - id: "children"
      label: "Children's Data (COPPA)"
    - id: "business"
      label: "Business/Corporate Data"
    - id: "public"
      label: "Public/Non-sensitive Data Only"
  validation:
    required: true
    minSelections: 1
  outputMapping:
    - "information_security_policy.data_classification"
    - "data_protection_policy.data_types"

SC-002:
  question: "What compliance standards must you meet?"
  type: multi_choice
  options:
    - id: "gdpr"
      label: "GDPR (EU Privacy)"
    - id: "ccpa"
      label: "CCPA (California Privacy)"
    - id: "hipaa"
      label: "HIPAA (Healthcare)"
    - id: "pci"
      label: "PCI-DSS (Payment Card)"
    - id: "soc2"
      label: "SOC 2 (Service Organization)"
    - id: "iso27001"
      label: "ISO 27001 (Information Security)"
    - id: "fedramp"
      label: "FedRAMP (US Government)"
    - id: "none"
      label: "No specific requirements"
  outputMapping:
    - "information_security_policy.compliance_requirements"
    - "vendor_management.compliance_requirements"

SC-003:
  question: "What authentication methods do you need?"
  type: multi_choice
  options:
    - id: "email_password"
      label: "Email/Password"
    - id: "social"
      label: "Social Login (Google, Facebook, etc.)"
    - id: "sso"
      label: "Single Sign-On (SSO)"
    - id: "mfa"
      label: "Multi-Factor Authentication (MFA)"
    - id: "biometric"
      label: "Biometric (Face ID, Touch ID)"
    - id: "passwordless"
      label: "Passwordless (Magic Links)"
    - id: "api_keys"
      label: "API Keys (for developers)"
  validation:
    required: true
    minSelections: 1
  outputMapping:
    - "product_architecture.authentication"
    - "information_security_policy.access_control"

SC-004:
  question: "What is your data retention requirement?"
  type: single_choice
  options:
    - id: "minimal"
      label: "Minimal (delete when no longer needed)"
    - id: "1_year"
      label: "1 year"
    - id: "3_years"
      label: "3 years"
    - id: "7_years"
      label: "7 years (financial compliance)"
    - id: "indefinite"
      label: "Indefinite retention"
    - id: "user_controlled"
      label: "User-controlled deletion"
  outputMapping:
    - "data_protection_policy.retention_policy"
    - "disaster_recovery.backup_retention"
```

---

## 7. Domain 6: Business Model (BM)

### 7.1 Revenue Model

```yaml
BM-001:
  question: "What is your primary revenue model?"
  type: single_choice
  options:
    - id: "subscription"
      label: "Subscription (recurring)"
    - id: "one_time"
      label: "One-time Purchase"
    - id: "freemium"
      label: "Freemium (free + premium)"
    - id: "usage"
      label: "Usage-based/Pay-per-use"
    - id: "marketplace"
      label: "Marketplace Commission"
    - id: "advertising"
      label: "Advertising"
    - id: "licensing"
      label: "Licensing"
    - id: "hybrid"
      label: "Hybrid/Multiple models"
  outputMapping:
    - "business_plan.financial_projections.revenue_model"
    - "frd.billing_requirements"

BM-002:
  question: "What pricing tiers do you plan to offer?"
  type: multi_choice
  visibilityRules:
    - condition: "BM-001 IN ['subscription', 'freemium']"
      action: "show"
  options:
    - id: "free"
      label: "Free Tier"
    - id: "starter"
      label: "Starter/Basic"
    - id: "professional"
      label: "Professional/Pro"
    - id: "business"
      label: "Business/Team"
    - id: "enterprise"
      label: "Enterprise (custom pricing)"
  outputMapping:
    - "business_plan.financial_projections.pricing_tiers"
    - "frd.subscription_tiers"

BM-003:
  question: "What is your target price point?"
  type: single_choice
  options:
    - id: "under_10"
      label: "Under $10/month"
    - id: "10_50"
      label: "$10 - $50/month"
    - id: "50_200"
      label: "$50 - $200/month"
    - id: "200_500"
      label: "$200 - $500/month"
    - id: "500_plus"
      label: "$500+/month"
    - id: "custom"
      label: "Custom/Enterprise pricing"
  outputMapping:
    - "business_plan.financial_projections.price_point"

BM-004:
  question: "What is your expected customer acquisition cost (CAC)?"
  type: single_choice
  options:
    - id: "under_50"
      label: "Under $50"
    - id: "50_200"
      label: "$50 - $200"
    - id: "200_500"
      label: "$200 - $500"
    - id: "500_1000"
      label: "$500 - $1,000"
    - id: "over_1000"
      label: "Over $1,000"
    - id: "unknown"
      label: "Unknown"
  outputMapping:
    - "business_plan.financial_projections.cac"
    - "business_case.unit_economics"

BM-005:
  question: "What is your target customer lifetime value (LTV)?"
  type: single_choice
  options:
    - id: "under_100"
      label: "Under $100"
    - id: "100_500"
      label: "$100 - $500"
    - id: "500_2000"
      label: "$500 - $2,000"
    - id: "2000_10000"
      label: "$2,000 - $10,000"
    - id: "over_10000"
      label: "Over $10,000"
    - id: "unknown"
      label: "Unknown"
  outputMapping:
    - "business_plan.financial_projections.ltv"
    - "business_case.unit_economics"
```

### 7.2 Financial Status

```yaml
BM-006:
  question: "What is your current funding status?"
  type: single_choice
  options:
    - id: "bootstrapped"
      label: "Bootstrapped (self-funded)"
    - id: "friends_family"
      label: "Friends & Family Round"
    - id: "pre_seed"
      label: "Pre-Seed"
    - id: "seed"
      label: "Seed Round"
    - id: "series_a"
      label: "Series A"
    - id: "series_b_plus"
      label: "Series B+"
    - id: "profitable"
      label: "Profitable/No funding needed"
  outputMapping:
    - "business_plan.financial_projections.funding_stage"

BM-007:
  question: "What is your monthly budget for this project?"
  type: single_choice
  options:
    - id: "under_5k"
      label: "Under $5,000/month"
    - id: "5k_15k"
      label: "$5,000 - $15,000/month"
    - id: "15k_50k"
      label: "$15,000 - $50,000/month"
    - id: "50k_100k"
      label: "$50,000 - $100,000/month"
    - id: "over_100k"
      label: "Over $100,000/month"
    - id: "flexible"
      label: "Flexible based on requirements"
  outputMapping:
    - "business_plan.financial_projections.budget"
    - "technology_roadmap.budget_constraints"

BM-008:
  question: "Do you have existing revenue?"
  type: single_choice
  options:
    - id: "no_revenue"
      label: "No revenue yet"
    - id: "under_10k"
      label: "Under $10K MRR"
    - id: "10k_50k"
      label: "$10K - $50K MRR"
    - id: "50k_100k"
      label: "$50K - $100K MRR"
    - id: "over_100k"
      label: "Over $100K MRR"
  outputMapping:
    - "business_plan.financial_projections.current_revenue"
```

---

## 8. Domain 7: Team & Operations (TO)

### 8.1 Team Structure

```yaml
TO-001:
  question: "What is your current team size?"
  type: single_choice
  options:
    - id: "solo"
      label: "Solo founder"
    - id: "2_5"
      label: "2-5 people"
    - id: "6_15"
      label: "6-15 people"
    - id: "16_50"
      label: "16-50 people"
    - id: "50_plus"
      label: "50+ people"
  outputMapping:
    - "business_plan.organization.team_size"
    - "engineering_handbook.team_structure"

TO-002:
  question: "Do you have in-house technical capabilities?"
  type: single_choice
  options:
    - id: "no_tech"
      label: "No technical team"
    - id: "limited"
      label: "Limited (1-2 developers)"
    - id: "small"
      label: "Small tech team (3-5 developers)"
    - id: "full"
      label: "Full engineering team (6+)"
    - id: "outsourced"
      label: "Fully outsourced development"
  outputMapping:
    - "technology_strategy.team_capabilities"
    - "engineering_handbook.staffing_model"

TO-003:
  question: "What technical roles do you need to hire?"
  type: multi_choice
  visibilityRules:
    - condition: "TO-002 IN ['no_tech', 'limited', 'outsourced']"
      action: "show"
  options:
    - id: "cto"
      label: "CTO/Technical Lead"
    - id: "backend"
      label: "Backend Developers"
    - id: "frontend"
      label: "Frontend Developers"
    - id: "mobile"
      label: "Mobile Developers"
    - id: "fullstack"
      label: "Full-Stack Developers"
    - id: "devops"
      label: "DevOps/Infrastructure"
    - id: "qa"
      label: "QA/Testing"
    - id: "design"
      label: "UI/UX Designers"
    - id: "product"
      label: "Product Manager"
  outputMapping:
    - "business_plan.organization.hiring_needs"
    - "onboarding_procedures.roles_needed"

TO-004:
  question: "What is your preferred development approach?"
  type: single_choice
  options:
    - id: "in_house"
      label: "In-house development"
    - id: "agency"
      label: "Development agency"
    - id: "freelancers"
      label: "Freelancers/Contractors"
    - id: "hybrid"
      label: "Hybrid (in-house + contractors)"
    - id: "no_code"
      label: "No-code/Low-code solutions"
  outputMapping:
    - "technology_strategy.development_approach"
    - "vendor_management.engagement_model"
```

---

## 9. Domain 8: Timeline & Milestones (TL)

### 9.1 Project Timeline

```yaml
TL-001:
  question: "When do you need the MVP ready?"
  type: single_choice
  options:
    - id: "asap"
      label: "As soon as possible"
    - id: "1_3_months"
      label: "1-3 months"
    - id: "3_6_months"
      label: "3-6 months"
    - id: "6_12_months"
      label: "6-12 months"
    - id: "over_12_months"
      label: "Over 12 months"
    - id: "flexible"
      label: "Flexible/No deadline"
  outputMapping:
    - "technology_roadmap.mvp_timeline"
    - "business_plan.milestones.mvp_target"

TL-002:
  question: "Do you have any hard deadlines?"
  type: single_choice
  options:
    - id: "no"
      label: "No hard deadlines"
    - id: "investor"
      label: "Yes, investor/funding deadline"
    - id: "launch"
      label: "Yes, planned launch event"
    - id: "contract"
      label: "Yes, contractual obligation"
    - id: "seasonal"
      label: "Yes, seasonal opportunity"
  outputMapping:
    - "technology_roadmap.deadline_type"
    - "business_plan.milestones.deadline"

TL-003:
  question: "If you have a hard deadline, what is the date?"
  type: date
  visibilityRules:
    - condition: "TL-002 != 'no'"
      action: "show"
  validation:
    required: true
  outputMapping:
    - "technology_roadmap.hard_deadline"
    - "business_plan.milestones.deadline_date"

TL-004:
  question: "What are your key milestones for the next 12 months?"
  type: text
  validation:
    minLength: 50
  helpText: "List major milestones (e.g., MVP launch, beta testing, first customer)"
  outputMapping:
    - "technology_roadmap.milestones"
    - "business_plan.milestones.year_one"
```

---

## 10. Domain 9: Support & Maintenance (SM)

### 10.1 Support Requirements

```yaml
SM-001:
  question: "What level of customer support do you need to provide?"
  type: single_choice
  options:
    - id: "self_service"
      label: "Self-service only (documentation, FAQ)"
    - id: "email"
      label: "Email support (business hours)"
    - id: "chat"
      label: "Live chat support"
    - id: "phone"
      label: "Phone support"
    - id: "24_7"
      label: "24/7 support"
    - id: "dedicated"
      label: "Dedicated account management"
  outputMapping:
    - "frd.support_requirements"
    - "business_plan.operations.support_model"

SM-002:
  question: "What SLA (Service Level Agreement) do you need to offer?"
  type: single_choice
  options:
    - id: "none"
      label: "No formal SLA"
    - id: "99"
      label: "99% uptime (3.65 days downtime/year)"
    - id: "99_9"
      label: "99.9% uptime (8.76 hours downtime/year)"
    - id: "99_99"
      label: "99.99% uptime (52.6 minutes downtime/year)"
    - id: "99_999"
      label: "99.999% uptime (5.26 minutes downtime/year)"
  outputMapping:
    - "disaster_recovery.sla_target"
    - "product_architecture.availability_requirements"

SM-003:
  question: "Do you need multi-language support?"
  type: single_choice
  options:
    - id: "english_only"
      label: "English only"
    - id: "2_5_languages"
      label: "2-5 languages"
    - id: "6_plus"
      label: "6+ languages"
    - id: "future"
      label: "Not now, but planned for future"
  outputMapping:
    - "frd.localization_requirements"
    - "product_architecture.i18n_requirements"

SM-004:
  question: "What accessibility requirements do you have?"
  type: single_choice
  options:
    - id: "basic"
      label: "Basic accessibility"
    - id: "wcag_a"
      label: "WCAG 2.1 Level A"
    - id: "wcag_aa"
      label: "WCAG 2.1 Level AA"
    - id: "wcag_aaa"
      label: "WCAG 2.1 Level AAA"
    - id: "section_508"
      label: "Section 508 Compliance"
  outputMapping:
    - "frd.accessibility_requirements"
    - "wireframes.accessibility_standards"
```

---

## 11. Supplementary Questions

### 11.1 Additional Context

```yaml
SUP-001:
  question: "Is there anything else we should know about your project?"
  type: text
  validation:
    maxLength: 2000
  helpText: "Any additional context, constraints, or requirements"
  outputMapping:
    - "brd.additional_notes"

SUP-002:
  question: "Do you have any existing documentation we should review?"
  type: single_choice
  options:
    - id: "none"
      label: "No existing documentation"
    - id: "pitch_deck"
      label: "Pitch deck available"
    - id: "business_plan"
      label: "Business plan available"
    - id: "technical_specs"
      label: "Technical specifications available"
    - id: "multiple"
      label: "Multiple documents available"
  outputMapping:
    - "brd.existing_documentation"

SUP-003:
  question: "Would you like to upload any existing documents?"
  type: file_upload
  visibilityRules:
    - condition: "SUP-002 != 'none'"
      action: "show"
  validation:
    allowedTypes: ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx"]
    maxSize: "10MB"
  outputMapping:
    - "brd.uploaded_documents"

SUP-004:
  question: "How did you hear about us?"
  type: single_choice
  options:
    - id: "search"
      label: "Search engine"
    - id: "referral"
      label: "Referral"
    - id: "social"
      label: "Social media"
    - id: "content"
      label: "Blog/Content"
    - id: "other"
      label: "Other"
  outputMapping:
    - "crm.lead_source"
```

---

## 12. Question Weights and Scoring

### 12.1 Weight Distribution

| Domain | Weight | Reasoning |
|--------|--------|-----------|
| Business Foundation | 5 | Core identity, required for all outputs |
| Product/Service | 5 | Essential for technical planning |
| Target Market | 4 | Critical for business planning |
| Technology | 4 | Required for architecture decisions |
| Security | 4 | Compliance and risk assessment |
| Business Model | 4 | Revenue and financial planning |
| Team | 3 | Operational planning |
| Timeline | 3 | Project management |
| Support | 3 | Operational requirements |

### 12.2 Completion Scoring

```javascript
calculateCompletionScore(responses) {
  let totalWeight = 0;
  let answeredWeight = 0;
  
  for (const question of questionBank) {
    if (isQuestionVisible(question, responses)) {
      totalWeight += question.weight;
      if (responses[question.id]) {
        answeredWeight += question.weight;
      }
    }
  }
  
  return (answeredWeight / totalWeight) * 100;
}
```

---

## 13. Question Statistics

| Metric | Value |
|--------|-------|
| Total Questions | 78 |
| Required Questions | 32 |
| Conditional Questions | 12 |
| Single Choice | 45 |
| Multi Choice | 18 |
| Text Input | 12 |
| Date Input | 2 |
| File Upload | 1 |

---

## Appendix A: Output Mapping Reference

Each question maps to specific sections in output documents:

| Document | Sections Mapped |
|----------|-----------------|
| Business Plan | Executive Summary, Company Description, Market Analysis, Financial Projections |
| BRD | Business Overview, Problem Definition, Proposed Solution |
| FRD | Core Features, MVP Features, Support Requirements |
| Product Architecture | Platforms, Integrations, Authentication, Infrastructure |
| Technology Strategy | Stack Preference, Product Category, Team Capabilities |
| Technology Roadmap | Current Stage, Milestones, Budget Constraints |
| Information Security Policy | Data Classification, Compliance, Access Control |
| Data Protection Policy | Data Types, Retention Policy, Applicable Regions |
| Disaster Recovery | Cloud Provider, Backup Retention, SLA Target |

---

*This question bank is designed to be comprehensive while remaining adaptive. Questions are shown or hidden based on previous responses, ensuring users only see relevant questions.*
