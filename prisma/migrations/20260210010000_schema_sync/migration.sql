-- Schema Sync Migration
-- Brings database in sync with current Prisma schema

-- DropForeignKey (will be recreated with correct ON DELETE)
ALTER TABLE "questionnaires" DROP CONSTRAINT IF EXISTS "questionnaires_created_by_fkey";

-- AlterTable: Add metadata to evidence_registry
ALTER TABLE "evidence_registry" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- AlterTable: Fix sessions - rename adaptive_state to adaptiveState, add persona
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sessions' AND column_name='adaptive_state') THEN
        ALTER TABLE "sessions" RENAME COLUMN "adaptive_state" TO "adaptiveState";
    END IF;
END $$;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "persona" "Persona";

-- CreateTable: oauth_accounts
CREATE TABLE IF NOT EXISTS "oauth_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "picture" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: score_snapshots
CREATE TABLE IF NOT EXISTS "score_snapshots" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "portfolioResidual" DECIMAL(7,6) NOT NULL,
    "completionPercentage" DECIMAL(5,2) NOT NULL,
    "dimension_breakdown" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "score_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable: evidence_chain
CREATE TABLE IF NOT EXISTS "evidence_chain" (
    "id" TEXT NOT NULL,
    "evidence_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "previous_hash" TEXT NOT NULL,
    "chain_hash" TEXT NOT NULL,
    "evidence_hash" TEXT NOT NULL,
    "timestamp_token" TEXT,
    "tsa_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "evidence_chain_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ci_artifacts
CREATE TABLE IF NOT EXISTS "ci_artifacts" (
    "id" TEXT NOT NULL,
    "evidence_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "ci_provider" TEXT NOT NULL,
    "build_id" TEXT NOT NULL,
    "build_number" TEXT,
    "pipeline_name" TEXT,
    "artifact_type" TEXT NOT NULL,
    "branch" TEXT,
    "commit_sha" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "parsed_metrics" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ci_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "oauth_accounts_user_id_idx" ON "oauth_accounts"("user_id");
CREATE INDEX IF NOT EXISTS "oauth_accounts_provider_idx" ON "oauth_accounts"("provider");
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_accounts_provider_provider_id_key" ON "oauth_accounts"("provider", "provider_id");
CREATE INDEX IF NOT EXISTS "score_snapshots_session_id_idx" ON "score_snapshots"("session_id");
CREATE INDEX IF NOT EXISTS "score_snapshots_session_id_created_at_idx" ON "score_snapshots"("session_id", "created_at");
CREATE INDEX IF NOT EXISTS "evidence_chain_evidence_id_idx" ON "evidence_chain"("evidence_id");
CREATE INDEX IF NOT EXISTS "evidence_chain_session_id_idx" ON "evidence_chain"("session_id");
CREATE INDEX IF NOT EXISTS "evidence_chain_chain_hash_idx" ON "evidence_chain"("chain_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "evidence_chain_session_id_sequence_number_key" ON "evidence_chain"("session_id", "sequence_number");
CREATE INDEX IF NOT EXISTS "ci_artifacts_session_id_idx" ON "ci_artifacts"("session_id");
CREATE INDEX IF NOT EXISTS "ci_artifacts_ci_provider_idx" ON "ci_artifacts"("ci_provider");
CREATE INDEX IF NOT EXISTS "ci_artifacts_build_id_idx" ON "ci_artifacts"("build_id");
CREATE INDEX IF NOT EXISTS "ci_artifacts_artifact_type_idx" ON "ci_artifacts"("artifact_type");

-- AddForeignKeys
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "questionnaires" ADD CONSTRAINT "questionnaires_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "score_snapshots" ADD CONSTRAINT "score_snapshots_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ci_artifacts" ADD CONSTRAINT "ci_artifacts_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence_registry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
