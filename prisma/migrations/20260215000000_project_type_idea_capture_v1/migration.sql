-- V1 groundwork: project types + idea capture
-- Additive migration only, preserving existing flows

CREATE TABLE "project_types" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_types_slug_key" ON "project_types"("slug");
CREATE INDEX "project_types_is_active_idx" ON "project_types"("is_active");
CREATE INDEX "project_types_is_default_idx" ON "project_types"("is_default");

CREATE TABLE "idea_captures" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "project_type_id" TEXT,
    "title" TEXT,
    "raw_input" TEXT NOT NULL,
    "analysis" JSONB NOT NULL DEFAULT '{}',
    "suggested_questions" JSONB,
    "status" TEXT NOT NULL DEFAULT 'CAPTURED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idea_captures_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idea_captures_user_id_idx" ON "idea_captures"("user_id");
CREATE INDEX "idea_captures_project_type_id_idx" ON "idea_captures"("project_type_id");
CREATE INDEX "idea_captures_created_at_idx" ON "idea_captures"("created_at");

ALTER TABLE "questionnaires" ADD COLUMN "project_type_id" TEXT;
CREATE INDEX "questionnaires_project_type_id_idx" ON "questionnaires"("project_type_id");

ALTER TABLE "sessions" ADD COLUMN "project_type_id" TEXT;
ALTER TABLE "sessions" ADD COLUMN "idea_capture_id" TEXT;
CREATE INDEX "sessions_project_type_id_idx" ON "sessions"("project_type_id");
CREATE INDEX "sessions_idea_capture_id_idx" ON "sessions"("idea_capture_id");

ALTER TABLE "dimension_catalog" ADD COLUMN "project_type_id" TEXT;
CREATE INDEX "dimension_catalog_project_type_id_idx" ON "dimension_catalog"("project_type_id");

ALTER TABLE "document_types" ADD COLUMN "project_type_id" TEXT;
CREATE INDEX "document_types_project_type_id_idx" ON "document_types"("project_type_id");

ALTER TABLE "idea_captures"
    ADD CONSTRAINT "idea_captures_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "idea_captures"
    ADD CONSTRAINT "idea_captures_project_type_id_fkey"
    FOREIGN KEY ("project_type_id") REFERENCES "project_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "questionnaires"
    ADD CONSTRAINT "questionnaires_project_type_id_fkey"
    FOREIGN KEY ("project_type_id") REFERENCES "project_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sessions"
    ADD CONSTRAINT "sessions_project_type_id_fkey"
    FOREIGN KEY ("project_type_id") REFERENCES "project_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sessions"
    ADD CONSTRAINT "sessions_idea_capture_id_fkey"
    FOREIGN KEY ("idea_capture_id") REFERENCES "idea_captures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "dimension_catalog"
    ADD CONSTRAINT "dimension_catalog_project_type_id_fkey"
    FOREIGN KEY ("project_type_id") REFERENCES "project_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "document_types"
    ADD CONSTRAINT "document_types_project_type_id_fkey"
    FOREIGN KEY ("project_type_id") REFERENCES "project_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed baseline project type rows for initial routing
INSERT INTO "project_types" (
    "id", "slug", "name", "description", "icon", "is_active", "is_default", "metadata", "created_at", "updated_at"
) VALUES
(
    '11111111-1111-4111-8111-111111111111',
    'technical-readiness',
    'Technical Readiness',
    'Legacy Quiz2Biz technical assessment flow with readiness scoring and heatmaps.',
    'shield-check',
    true,
    true,
    '{"routing":"legacy-readiness"}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    '22222222-2222-4222-8222-222222222222',
    'idea-to-docs',
    'Idea to Documents',
    'Capture a project idea and generate selected business and delivery documents.',
    'lightbulb',
    true,
    false,
    '{"routing":"idea-first"}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
