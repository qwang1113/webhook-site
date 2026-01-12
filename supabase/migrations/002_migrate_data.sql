-- Migration: Migrate existing data to first user
-- Run this AFTER the first user has registered
-- Replace {FIRST_USER_ID} with the actual user UUID from auth.users

-- Step 1: Find your user ID by running:
-- SELECT id, email FROM auth.users ORDER BY created_at LIMIT 1;

-- Step 2: Update all endpoints to belong to that user
-- UPDATE webhook_endpoints SET user_id = 'YOUR_USER_UUID_HERE' WHERE user_id IS NULL;

-- Step 3: After verifying the migration, make user_id required
-- ALTER TABLE webhook_endpoints ALTER COLUMN user_id SET NOT NULL;

-- Example (uncomment and modify):
-- UPDATE webhook_endpoints SET user_id = '12345678-1234-1234-1234-123456789012' WHERE user_id IS NULL;
