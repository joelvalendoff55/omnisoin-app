-- Add temperature column to patient_vital_signs
ALTER TABLE public.patient_vital_signs
ADD COLUMN IF NOT EXISTS temperature_celsius NUMERIC(3,1);

-- Add comment for documentation
COMMENT ON COLUMN public.patient_vital_signs.temperature_celsius IS 'Body temperature in Celsius degrees';