-- Add missing transition: waiting can go directly to in_consultation (for walk-ins without formal call)
INSERT INTO public.patient_status_transitions (from_status, to_status, requires_reason, requires_billing, is_reversible, description) 
VALUES ('waiting', 'in_consultation', false, false, true, 'Patient passe directement en consultation')
ON CONFLICT (from_status, to_status) DO NOTHING;