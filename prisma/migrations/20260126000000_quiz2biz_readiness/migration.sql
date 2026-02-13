-- Quiz2Biz Readiness Enhancement Migration
-- Adds: Persona-driven questions, Readiness scoring, Evidence registry, Decision log

-- =============================================================================
-- NEW ENUMS
-- =============================================================================

-- Persona enum for question targeting
CREATE TYPE "Persona" AS ENUM ('CTO', 'CFO', 'CEO', 'BA', 'POLICY');

-- Evidence artifact types
CREATE TYPE "EvidenceType" AS ENUM ('FILE', 'IMAGE', 'LINK', 'LOG', 'SBOM', 'REPORT', 'TEST_RESULT', 'SCREENSHOT', 'DOCUMENT');

-- Decision status for append-only workflow
CREATE TYPE "DecisionStatus" AS ENUM ('DRAFT', 'LOCKED', 'AMENDED', 'SUPERSEDED');

-- Add CEO, POLICY, SEO to DocumentCategory if not exists
ALTER TYPE "DocumentCategory" ADD VALUE IF NOT EXISTS 'CEO';
ALTER TYPE "DocumentCategory" ADD VALUE IF NOT EXISTS 'POLICY';
ALTER TYPE "DocumentCategory" ADD VALUE IF NOT EXISTS 'SEO';

-- =============================================================================
-- DIMENSION CATALOG TABLE
-- =============================================================================

CREATE TABLE "dimension_catalog" (
    "key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "weight" DECIMAL(4,3) NOT NULL,
    "order_index" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dimension_catalog_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "dimension_catalog_order_index_idx" ON "dimension_catalog"("order_index");
CREATE INDEX "dimension_catalog_is_active_idx" ON "dimension_catalog"("is_active");

-- =============================================================================
-- EVIDENCE REGISTRY TABLE
-- =============================================================================

CREATE TABLE "evidence_registry" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "artifact_url" TEXT NOT NULL,
    "artifact_type" "EvidenceType" NOT NULL,
    "file_name" TEXT,
    "file_size" BIGINT,
    "mime_type" TEXT,
    "drive_id" TEXT,
    "item_id" TEXT,
    "e_tag" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifier_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "hash_signature" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_registry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "evidence_registry_session_id_idx" ON "evidence_registry"("session_id");
CREATE INDEX "evidence_registry_question_id_idx" ON "evidence_registry"("question_id");
CREATE INDEX "evidence_registry_verified_idx" ON "evidence_registry"("verified");
CREATE INDEX "evidence_registry_artifact_type_idx" ON "evidence_registry"("artifact_type");

-- Foreign keys for evidence_registry
ALTER TABLE "evidence_registry" ADD CONSTRAINT "evidence_registry_session_id_fkey" 
    FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evidence_registry" ADD CONSTRAINT "evidence_registry_question_id_fkey" 
    FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_registry" ADD CONSTRAINT "evidence_registry_verifier_id_fkey" 
    FOREIGN KEY ("verifier_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- DECISION LOG TABLE (APPEND-ONLY)
-- =============================================================================

CREATE TABLE "decision_log" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "assumptions" TEXT,
    "references" TEXT,
    "owner_id" TEXT NOT NULL,
    "status" "DecisionStatus" NOT NULL DEFAULT 'DRAFT',
    "supersedes_decision_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "decision_log_session_id_idx" ON "decision_log"("session_id");
CREATE INDEX "decision_log_owner_id_idx" ON "decision_log"("owner_id");
CREATE INDEX "decision_log_status_idx" ON "decision_log"("status");
CREATE INDEX "decision_log_created_at_idx" ON "decision_log"("created_at");

-- Foreign keys for decision_log
ALTER TABLE "decision_log" ADD CONSTRAINT "decision_log_session_id_fkey" 
    FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "decision_log" ADD CONSTRAINT "decision_log_owner_id_fkey" 
    FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "decision_log" ADD CONSTRAINT "decision_log_supersedes_decision_id_fkey" 
    FOREIGN KEY ("supersedes_decision_id") REFERENCES "decision_log"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- EXTEND QUESTIONS TABLE
-- =============================================================================

-- Add persona-driven fields to questions
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "persona" "Persona" DEFAULT 'BA';
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "dimension_key" TEXT;
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "severity" DECIMAL(3,2) DEFAULT 0.5;
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "best_practice" TEXT;
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "practical_explainer" TEXT;
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "standard_refs" TEXT;
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "acceptance" TEXT;

-- Add indexes for new question fields
CREATE INDEX IF NOT EXISTS "questions_persona_idx" ON "questions"("persona");
CREATE INDEX IF NOT EXISTS "questions_dimension_key_idx" ON "questions"("dimension_key");

-- Foreign key for dimension
ALTER TABLE "questions" ADD CONSTRAINT "questions_dimension_key_fkey" 
    FOREIGN KEY ("dimension_key") REFERENCES "dimension_catalog"("key") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- EXTEND RESPONSES TABLE
-- =============================================================================

-- Add coverage tracking fields to responses
ALTER TABLE "responses" ADD COLUMN IF NOT EXISTS "coverage" DECIMAL(3,2) DEFAULT 0;
ALTER TABLE "responses" ADD COLUMN IF NOT EXISTS "rationale" TEXT;
ALTER TABLE "responses" ADD COLUMN IF NOT EXISTS "evidence_count" INTEGER NOT NULL DEFAULT 0;

-- Add index for coverage
CREATE INDEX IF NOT EXISTS "responses_coverage_idx" ON "responses"("coverage");

-- =============================================================================
-- EXTEND SESSIONS TABLE
-- =============================================================================

-- Add readiness score tracking to sessions
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "readiness_score" DECIMAL(5,2);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "last_score_calculation" TIMESTAMP(3);

-- Add index for readiness score
CREATE INDEX IF NOT EXISTS "sessions_readiness_score_idx" ON "sessions"("readiness_score");

-- =============================================================================
-- SEED DIMENSION CATALOG
-- =============================================================================

INSERT INTO "dimension_catalog" ("key", "display_name", "description", "weight", "order_index", "created_at", "updated_at")
VALUES 
    ('strategy', 'Strategy & Vision', 'CEO-level strategic planning, OKRs, and business goals', 0.080, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('requirements', 'Requirements & Analysis', 'BA-level requirements gathering and process analysis', 0.080, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('arch_sec', 'Architecture & Security', 'CTO-level architecture decisions, security controls, and threat modeling', 0.150, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('devops_iac', 'DevOps & Infrastructure', 'CI/CD pipelines, IaC, and platform engineering', 0.120, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('data_ai', 'Data & AI', 'Data architecture, analytics, and AI/ML capabilities', 0.080, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('quality_test', 'Quality & Testing', 'Test strategy, coverage, and quality gates', 0.100, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('privacy_legal', 'Privacy & Legal', 'Data protection, GDPR/CCPA compliance, and legal requirements', 0.080, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('compliance_policy', 'Compliance & Policy', 'Policy-level controls, ISO/SOC compliance, and governance', 0.070, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('finance', 'Finance & Economics', 'CFO-level unit economics, budgets, and financial modeling', 0.100, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('people_change', 'People & Change', 'Team structure, hiring, and change management', 0.060, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('service_ops', 'Service Operations', 'SRE, observability, incident management, and support', 0.080, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
    "display_name" = EXCLUDED."display_name",
    "description" = EXCLUDED."description",
    "weight" = EXCLUDED."weight",
    "order_index" = EXCLUDED."order_index",
    "updated_at" = CURRENT_TIMESTAMP;
