-- Add patient origin fields to track how patients arrived at the MSP
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS origin_type TEXT,
ADD COLUMN IF NOT EXISTS origin_referrer_name TEXT,
ADD COLUMN IF NOT EXISTS origin_notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.patients.origin_type IS 'How the patient arrived: spontane, medecin_liberal, samu, hopital, autre_pro, autre';
COMMENT ON COLUMN public.patients.origin_referrer_name IS 'Name of referring doctor, hospital, or professional if applicable';
COMMENT ON COLUMN public.patients.origin_notes IS 'Additional notes about patient origin';