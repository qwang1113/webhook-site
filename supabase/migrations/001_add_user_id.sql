-- Migration: Add user_id to webhook_endpoints for Supabase Auth integration
-- Run this migration first, before deploying the new code

-- 1. Add user_id column (initially nullable for migration)
ALTER TABLE webhook_endpoints
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Create index for user endpoint queries
CREATE INDEX IF NOT EXISTS idx_endpoints_user_id ON webhook_endpoints(user_id);

-- 3. Create composite index for user endpoints sorted by creation
CREATE INDEX IF NOT EXISTS idx_endpoints_user_created_desc
ON webhook_endpoints(user_id, created_at DESC);

-- 4. Drop the old manage_key_hash column (no longer needed with Supabase Auth)
ALTER TABLE webhook_endpoints DROP COLUMN IF EXISTS manage_key_hash;
