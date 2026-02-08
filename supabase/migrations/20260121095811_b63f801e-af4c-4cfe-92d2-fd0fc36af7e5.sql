-- Create identities_vault table for PII data (Privacy by Design)
CREATE TABLE public.identities_vault (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_uuid uuid NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  email text,
  nir text, -- Numéro de sécurité sociale (encrypted at rest)
  date_of_birth date,
  structure_id uuid NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.identities_vault ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Very restrictive access
CREATE POLICY "identities_vault_select_same_structure"
ON public.identities_vault
FOR SELECT
USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "identities_vault_insert_staff"
ON public.identities_vault
FOR INSERT
WITH CHECK (
  structure_id = get_user_structure_id(auth.uid()) 
  AND created_by = auth.uid()
  AND (has_role(auth.uid(), 'admin'::app_role) 
       OR has_role(auth.uid(), 'coordinator'::app_role) 
       OR has_role(auth.uid(), 'practitioner'::app_role))
);

CREATE POLICY "identities_vault_update_staff"
ON public.identities_vault
FOR UPDATE
USING (
  structure_id = get_user_structure_id(auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) 
       OR has_role(auth.uid(), 'coordinator'::app_role))
);

-- No delete policy - GDPR requires explicit deletion process
CREATE POLICY "identities_vault_no_delete"
ON public.identities_vault
FOR DELETE
USING (false);

-- Index for fast UUID lookups
CREATE INDEX idx_identities_vault_patient_uuid ON public.identities_vault(patient_uuid);
CREATE INDEX idx_identities_vault_structure ON public.identities_vault(structure_id);

-- Trigger for updated_at
CREATE TRIGGER update_identities_vault_updated_at
BEFORE UPDATE ON public.identities_vault
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();