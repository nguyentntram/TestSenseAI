-- Store the full unified diff for each PR so the generation prompt can
-- reference the exact changes without refetching from GitHub.
ALTER TABLE pull_requests ADD COLUMN IF NOT EXISTS diff_text TEXT;
