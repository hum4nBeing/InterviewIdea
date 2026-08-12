-- Add new columns for Phase 2: Candidate parsing and feedback JSON
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS target_role TEXT,
ADD COLUMN IF NOT EXISTS cv_text TEXT,
ADD COLUMN IF NOT EXISTS github_username TEXT,
ADD COLUMN IF NOT EXISTS generated_prompt TEXT,
ADD COLUMN IF NOT EXISTS feedback_json JSONB;
