-- Add temperature and max_tokens columns to system_prompts
ALTER TABLE public.system_prompts
ADD COLUMN IF NOT EXISTS temperature NUMERIC(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 2048 CHECK (max_tokens > 0 AND max_tokens <= 128000);

-- Add same columns to prompt_versions for version-specific settings
ALTER TABLE public.prompt_versions
ADD COLUMN IF NOT EXISTS temperature NUMERIC(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 2048 CHECK (max_tokens > 0 AND max_tokens <= 128000);