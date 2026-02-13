-- Migration: 5-Level Coverage Scale
-- Converts continuous coverage values to discrete 5-level CoverageLevel enum
-- Coverage mapping: 0.0=NONE, 0.25=PARTIAL, 0.5=HALF, 0.75=SUBSTANTIAL, 1.0=FULL

-- Create the CoverageLevel enum type
CREATE TYPE "CoverageLevel" AS ENUM ('NONE', 'PARTIAL', 'HALF', 'SUBSTANTIAL', 'FULL');

-- Add coverage_level column to responses table
ALTER TABLE "responses" ADD COLUMN "coverage_level" "CoverageLevel" NOT NULL DEFAULT 'NONE';

-- Add coverage_value column to evidence_registry table  
ALTER TABLE "evidence_registry" ADD COLUMN "coverage_value" "CoverageLevel" NOT NULL DEFAULT 'NONE';

-- Migrate existing continuous coverage values to discrete levels
-- Uses nearest-neighbor rounding to closest 0.25 increment
UPDATE "responses" 
SET "coverage_level" = CASE
    WHEN "coverage" IS NULL OR "coverage" < 0.125 THEN 'NONE'::\"CoverageLevel\"
    WHEN "coverage" >= 0.125 AND "coverage" < 0.375 THEN 'PARTIAL'::\"CoverageLevel\"
    WHEN "coverage" >= 0.375 AND "coverage" < 0.625 THEN 'HALF'::\"CoverageLevel\"
    WHEN "coverage" >= 0.625 AND "coverage" < 0.875 THEN 'SUBSTANTIAL'::\"CoverageLevel\"
    ELSE 'FULL'::\"CoverageLevel\"
END;

-- Create index on coverage_level for filtering
CREATE INDEX "responses_coverage_level_idx" ON "responses"("coverage_level");

-- Create helper function to convert CoverageLevel to decimal
CREATE OR REPLACE FUNCTION coverage_level_to_decimal(level "CoverageLevel") 
RETURNS DECIMAL(3, 2) AS $$
BEGIN
    RETURN CASE level
        WHEN 'NONE' THEN 0.00
        WHEN 'PARTIAL' THEN 0.25
        WHEN 'HALF' THEN 0.50
        WHEN 'SUBSTANTIAL' THEN 0.75
        WHEN 'FULL' THEN 1.00
        ELSE 0.00
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create helper function to convert decimal to CoverageLevel
CREATE OR REPLACE FUNCTION decimal_to_coverage_level(val DECIMAL(3, 2)) 
RETURNS "CoverageLevel" AS $$
BEGIN
    RETURN CASE
        WHEN val IS NULL OR val < 0.125 THEN 'NONE'::"CoverageLevel"
        WHEN val >= 0.125 AND val < 0.375 THEN 'PARTIAL'::"CoverageLevel"
        WHEN val >= 0.375 AND val < 0.625 THEN 'HALF'::"CoverageLevel"
        WHEN val >= 0.625 AND val < 0.875 THEN 'SUBSTANTIAL'::"CoverageLevel"
        ELSE 'FULL'::"CoverageLevel"
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create trigger to keep coverage and coverage_level in sync
CREATE OR REPLACE FUNCTION sync_coverage_level()
RETURNS TRIGGER AS $$
BEGIN
    -- If coverage_level changed, update coverage decimal
    IF NEW.coverage_level IS DISTINCT FROM OLD.coverage_level THEN
        NEW.coverage = coverage_level_to_decimal(NEW.coverage_level);
    -- If coverage decimal changed, update coverage_level
    ELSIF NEW.coverage IS DISTINCT FROM OLD.coverage THEN
        NEW.coverage_level = decimal_to_coverage_level(NEW.coverage);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER response_coverage_sync
    BEFORE UPDATE ON "responses"
    FOR EACH ROW
    EXECUTE FUNCTION sync_coverage_level();

-- Sync trigger for INSERT to set initial coverage based on coverage_level
CREATE OR REPLACE FUNCTION set_initial_coverage()
RETURNS TRIGGER AS $$
BEGIN
    -- On insert, sync coverage decimal from coverage_level
    IF NEW.coverage IS NULL OR NEW.coverage = 0 THEN
        NEW.coverage = coverage_level_to_decimal(NEW.coverage_level);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER response_coverage_init
    BEFORE INSERT ON "responses"
    FOR EACH ROW
    EXECUTE FUNCTION set_initial_coverage();
