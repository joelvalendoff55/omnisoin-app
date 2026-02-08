-- =====================================================
-- MÉDICO-LÉGAL: Tracking IA vs Humain & Validation Médicale
-- =====================================================

-- 1. Table d'attribution du contenu (IA vs Humain)
CREATE TABLE public.content_authorship_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Référence polymorphique au contenu
  entity_type TEXT NOT NULL CHECK (entity_type IN ('consultation', 'anamnesis', 'prescription', 'document', 'note')),
  entity_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  
  -- Attribution
  source_type TEXT NOT NULL CHECK (source_type IN ('ai_generated', 'human_created', 'human_modified', 'ai_assisted')),
  ai_model TEXT,
  ai_confidence NUMERIC(3,2),
  
  -- Acteur humain
  actor_user_id UUID REFERENCES auth.users(id),
  actor_name TEXT,
  actor_role TEXT,
  
  -- Contenu versionné
  content_snapshot TEXT,
  content_hash TEXT,
  version_number INTEGER NOT NULL DEFAULT 1,
  
  -- Métadonnées
  structure_id UUID NOT NULL REFERENCES public.structures(id),
  patient_id UUID REFERENCES public.patients(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_entity_version UNIQUE (entity_type, entity_id, field_name, version_number)
);

-- Index pour performance
CREATE INDEX idx_authorship_entity ON public.content_authorship_log(entity_type, entity_id);
CREATE INDEX idx_authorship_structure ON public.content_authorship_log(structure_id);
CREATE INDEX idx_authorship_patient ON public.content_authorship_log(patient_id);
CREATE INDEX idx_authorship_created ON public.content_authorship_log(created_at DESC);

-- 2. Table de validation médicale explicite
CREATE TABLE public.consultation_validations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  
  validator_user_id UUID NOT NULL REFERENCES auth.users(id),
  validator_name TEXT NOT NULL,
  validator_role TEXT NOT NULL,
  
  validated_content JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  
  validation_statement TEXT NOT NULL DEFAULT 'Je valide le contenu médical de cette consultation',
  signature_hash TEXT NOT NULL DEFAULT '',
  
  structure_id UUID NOT NULL REFERENCES public.structures(id),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  ip_address TEXT,
  user_agent TEXT,
  
  validated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1
);

-- Index pour validation
CREATE INDEX idx_validation_consultation ON public.consultation_validations(consultation_id);
CREATE INDEX idx_validation_validator ON public.consultation_validations(validator_user_id);
CREATE INDEX idx_validation_validated_at ON public.consultation_validations(validated_at DESC);

-- 3. Enable RLS
ALTER TABLE public.content_authorship_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_validations ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies pour content_authorship_log
CREATE POLICY "Staff can view authorship logs for their structure"
ON public.content_authorship_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.structure_id = content_authorship_log.structure_id
    AND ur.is_active = true
  )
);

CREATE POLICY "Staff can create authorship logs for their structure"
ON public.content_authorship_log FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.structure_id = content_authorship_log.structure_id
    AND ur.is_active = true
  )
);

-- 5. RLS Policies pour consultation_validations
CREATE POLICY "Staff can view validations for their structure"
ON public.consultation_validations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.structure_id = consultation_validations.structure_id
    AND ur.is_active = true
  )
);

CREATE POLICY "Practitioners can create validations"
ON public.consultation_validations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.structure_id = consultation_validations.structure_id
    AND ur.role IN ('admin', 'practitioner')
    AND ur.is_active = true
  )
  AND validator_user_id = auth.uid()
);

-- 6. Fonction pour calculer le hash de signature
CREATE OR REPLACE FUNCTION public.compute_validation_signature(
  p_user_id UUID,
  p_content_hash TEXT,
  p_timestamp TIMESTAMP WITH TIME ZONE
) RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    digest(
      p_user_id::text || '|' || p_content_hash || '|' || p_timestamp::text,
      'sha256'
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. Trigger pour auto-calculer signature_hash
CREATE OR REPLACE FUNCTION public.set_validation_signature()
RETURNS TRIGGER AS $$
BEGIN
  NEW.signature_hash := public.compute_validation_signature(
    NEW.validator_user_id,
    NEW.content_hash,
    NEW.validated_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_set_validation_signature
BEFORE INSERT ON public.consultation_validations
FOR EACH ROW
EXECUTE FUNCTION public.set_validation_signature();

-- 8. Trigger pour auto-incrémenter version_number dans authorship
CREATE OR REPLACE FUNCTION public.set_authorship_version()
RETURNS TRIGGER AS $$
DECLARE
  max_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) INTO max_version
  FROM public.content_authorship_log
  WHERE entity_type = NEW.entity_type
    AND entity_id = NEW.entity_id
    AND field_name = NEW.field_name;
  
  NEW.version_number := max_version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_set_authorship_version
BEFORE INSERT ON public.content_authorship_log
FOR EACH ROW
EXECUTE FUNCTION public.set_authorship_version();

-- 9. Enable realtime pour suivi en temps réel
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_authorship_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.consultation_validations;