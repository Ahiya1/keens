-- Migration 005: Fix password_hash constraint to support Supabase Auth
-- Makes password_hash nullable to support both Supabase Auth and custom auth

-- Drop the NOT NULL constraint on password_hash
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN users.password_hash IS 'Nullable bcrypt hash - null for Supabase Auth users, populated for custom auth users';

-- Create index on password_hash for performance (only non-null values)
CREATE INDEX CONCURRENTLY idx_users_password_hash ON users(password_hash) WHERE password_hash IS NOT NULL;
