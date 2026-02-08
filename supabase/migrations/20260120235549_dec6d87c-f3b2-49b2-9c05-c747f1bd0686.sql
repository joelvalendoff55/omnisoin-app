-- Add finess column to structures table
ALTER TABLE public.structures
ADD COLUMN IF NOT EXISTS finess TEXT;