-- Ajouter les colonnes manquantes pour SpO₂ et température
ALTER TABLE public.patient_vital_signs 
ADD COLUMN IF NOT EXISTS temperature_celsius NUMERIC(4,2),
ADD COLUMN IF NOT EXISTS spo2 INTEGER;

-- Ajouter commentaires pour documentation
COMMENT ON COLUMN public.patient_vital_signs.temperature_celsius IS 'Température corporelle en °C';
COMMENT ON COLUMN public.patient_vital_signs.spo2 IS 'Saturation en oxygène en %';