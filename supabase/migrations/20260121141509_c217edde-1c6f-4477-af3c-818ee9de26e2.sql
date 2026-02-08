-- SPRINT 4: Consentements éclairés

-- 1. Créer enum pour type de consentement patient
DO $$ BEGIN
  CREATE TYPE patient_consent_type AS ENUM ('care', 'data_processing', 'recording', 'ai_analysis', 'data_sharing');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Créer enum pour statut de consentement
DO $$ BEGIN
  CREATE TYPE consent_status AS ENUM ('pending', 'obtained', 'refused', 'revoked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Créer table consent_templates
CREATE TABLE IF NOT EXISTS public.consent_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  structure_id UUID NOT NULL,
  consent_type patient_consent_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  required_for_care BOOLEAN NOT NULL DEFAULT false,
  legal_references TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(structure_id, consent_type, version)
);

-- 4. RLS pour consent_templates
ALTER TABLE public.consent_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consent_templates_select_same_structure"
  ON public.consent_templates
  FOR SELECT
  USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "consent_templates_insert_admin_coordinator"
  ON public.consent_templates
  FOR INSERT
  WITH CHECK (
    structure_id = get_user_structure_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))
  );

CREATE POLICY "consent_templates_update_admin_coordinator"
  ON public.consent_templates
  FOR UPDATE
  USING (
    structure_id = get_user_structure_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))
  );

CREATE POLICY "consent_templates_delete_admin"
  ON public.consent_templates
  FOR DELETE
  USING (
    structure_id = get_user_structure_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- 5. Créer table patient_consents
CREATE TABLE IF NOT EXISTS public.patient_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  structure_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  template_id UUID REFERENCES public.consent_templates(id),
  consent_type patient_consent_type NOT NULL,
  status consent_status NOT NULL DEFAULT 'pending',
  obtained_by UUID,
  obtained_at TIMESTAMP WITH TIME ZONE,
  refused_at TIMESTAMP WITH TIME ZONE,
  refused_reason TEXT,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID,
  revoked_reason TEXT,
  signed_document_url TEXT,
  signature_data TEXT,
  ip_address INET,
  user_agent TEXT,
  scroll_completed BOOLEAN DEFAULT false,
  checkbox_confirmed BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. RLS pour patient_consents
ALTER TABLE public.patient_consents ENABLE ROW LEVEL SECURITY;

-- Lecture : staff de la structure
CREATE POLICY "patient_consents_select_same_structure"
  ON public.patient_consents
  FOR SELECT
  USING (structure_id = get_user_structure_id(auth.uid()));

-- Insertion : staff peut créer
CREATE POLICY "patient_consents_insert_staff"
  ON public.patient_consents
  FOR INSERT
  WITH CHECK (
    structure_id = get_user_structure_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'coordinator'::app_role) OR
      has_role(auth.uid(), 'practitioner'::app_role) OR
      has_role(auth.uid(), 'assistant'::app_role) OR
      has_role(auth.uid(), 'nurse'::app_role) OR
      has_role(auth.uid(), 'ipa'::app_role)
    )
  );

-- Update : staff peut mettre à jour (pour révocation, etc.)
CREATE POLICY "patient_consents_update_staff"
  ON public.patient_consents
  FOR UPDATE
  USING (
    structure_id = get_user_structure_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'coordinator'::app_role) OR
      has_role(auth.uid(), 'practitioner'::app_role) OR
      has_role(auth.uid(), 'assistant'::app_role) OR
      has_role(auth.uid(), 'nurse'::app_role) OR
      has_role(auth.uid(), 'ipa'::app_role)
    )
  );

-- Delete : admin uniquement
CREATE POLICY "patient_consents_delete_admin"
  ON public.patient_consents
  FOR DELETE
  USING (
    structure_id = get_user_structure_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- 7. Créer table audit pour consentements
CREATE TABLE IF NOT EXISTS public.consent_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consent_id UUID NOT NULL REFERENCES public.patient_consents(id) ON DELETE CASCADE,
  structure_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  action TEXT NOT NULL,
  previous_status consent_status,
  new_status consent_status,
  changed_by UUID NOT NULL,
  changed_by_role app_role NOT NULL,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. RLS pour consent_audit
ALTER TABLE public.consent_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consent_audit_select_same_structure"
  ON public.consent_audit
  FOR SELECT
  USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "consent_audit_insert_same_structure"
  ON public.consent_audit
  FOR INSERT
  WITH CHECK (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "consent_audit_no_update"
  ON public.consent_audit
  FOR UPDATE
  USING (false);

CREATE POLICY "consent_audit_no_delete"
  ON public.consent_audit
  FOR DELETE
  USING (false);

-- 9. Trigger pour audit automatique des consentements
CREATE OR REPLACE FUNCTION public.log_consent_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role app_role;
BEGIN
  v_user_role := get_user_primary_role(auth.uid());
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.consent_audit (
      consent_id,
      structure_id,
      patient_id,
      action,
      new_status,
      changed_by,
      changed_by_role,
      ip_address,
      user_agent,
      metadata
    ) VALUES (
      NEW.id,
      NEW.structure_id,
      NEW.patient_id,
      'consent_created',
      NEW.status,
      COALESCE(auth.uid(), NEW.obtained_by),
      COALESCE(v_user_role, 'assistant'),
      NEW.ip_address,
      NEW.user_agent,
      jsonb_build_object(
        'consent_type', NEW.consent_type,
        'template_id', NEW.template_id
      )
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status change
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.consent_audit (
        consent_id,
        structure_id,
        patient_id,
        action,
        previous_status,
        new_status,
        changed_by,
        changed_by_role,
        reason,
        ip_address,
        metadata
      ) VALUES (
        NEW.id,
        NEW.structure_id,
        NEW.patient_id,
        CASE 
          WHEN NEW.status = 'obtained' THEN 'consent_obtained'
          WHEN NEW.status = 'refused' THEN 'consent_refused'
          WHEN NEW.status = 'revoked' THEN 'consent_revoked'
          ELSE 'consent_updated'
        END,
        OLD.status,
        NEW.status,
        COALESCE(auth.uid(), NEW.revoked_by, NEW.obtained_by),
        COALESCE(v_user_role, 'assistant'),
        COALESCE(NEW.revoked_reason, NEW.refused_reason),
        NEW.ip_address,
        jsonb_build_object(
          'consent_type', NEW.consent_type,
          'scroll_completed', NEW.scroll_completed,
          'checkbox_confirmed', NEW.checkbox_confirmed
        )
      );
    END IF;
    
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- 10. Attacher trigger
DROP TRIGGER IF EXISTS consent_audit_trigger ON public.patient_consents;
CREATE TRIGGER consent_audit_trigger
  AFTER INSERT OR UPDATE ON public.patient_consents
  FOR EACH ROW
  EXECUTE FUNCTION public.log_consent_changes();

-- 11. Index pour performance
CREATE INDEX IF NOT EXISTS idx_consent_templates_structure_type 
  ON public.consent_templates(structure_id, consent_type, is_active);
CREATE INDEX IF NOT EXISTS idx_patient_consents_patient 
  ON public.patient_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_consents_structure_status 
  ON public.patient_consents(structure_id, status);
CREATE INDEX IF NOT EXISTS idx_consent_audit_consent 
  ON public.consent_audit(consent_id);
CREATE INDEX IF NOT EXISTS idx_consent_audit_patient 
  ON public.consent_audit(patient_id);

-- 12. Insérer templates par défaut (optionnel - pour chaque structure)
-- Ces templates peuvent être personnalisés par structure
INSERT INTO public.consent_templates (structure_id, consent_type, title, content, version, is_active, required_for_care, legal_references, created_by)
SELECT 
  s.id as structure_id,
  ct.consent_type,
  ct.title,
  ct.content,
  1 as version,
  true as is_active,
  ct.required_for_care,
  ct.legal_references,
  (SELECT user_id FROM profiles WHERE structure_id = s.id LIMIT 1) as created_by
FROM public.structures s
CROSS JOIN (
  VALUES 
    ('care'::patient_consent_type, 
     'Consentement aux soins', 
     'Je, soussigné(e), déclare avoir été informé(e) de manière claire et compréhensible sur :
     
• La nature et le déroulement des actes de soins proposés
• Les bénéfices attendus et les risques éventuels
• Les alternatives thérapeutiques possibles
• Les conséquences en cas de refus

Je consens librement à recevoir les soins proposés par l''équipe médicale de cette structure.

Ce consentement peut être retiré à tout moment.',
     true,
     ARRAY['Article L.1111-4 du Code de la santé publique', 'Article R.4127-36 du Code de déontologie médicale']),
    
    ('data_processing'::patient_consent_type,
     'Consentement au traitement des données de santé',
     'Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, je consens au traitement de mes données de santé par cette structure médicale.

Mes données seront utilisées pour :
• La prise en charge médicale et le suivi de mon dossier patient
• La coordination des soins avec les professionnels de santé impliqués
• Les obligations légales de conservation des dossiers médicaux

Mes droits :
• Droit d''accès, de rectification et d''effacement de mes données
• Droit à la portabilité de mes données
• Droit d''opposition et de limitation du traitement
• Droit de retirer mon consentement à tout moment

Responsable du traitement : [Nom de la structure]
Contact DPO : [Email DPO]',
     true,
     ARRAY['Règlement (UE) 2016/679 (RGPD)', 'Loi n°78-17 Informatique et Libertés', 'Article L.1111-8 du Code de la santé publique']),
    
    ('recording'::patient_consent_type,
     'Consentement à l''enregistrement audio',
     'Je consens à l''enregistrement audio de ma consultation médicale.

Cet enregistrement est utilisé pour :
• Faciliter la retranscription fidèle de nos échanges
• Améliorer la qualité de la prise en charge médicale
• Permettre une documentation précise du dossier médical

L''enregistrement sera :
• Stocké de manière sécurisée et confidentielle
• Accessible uniquement aux professionnels de santé habilités
• Conservé conformément aux durées légales
• Supprimé sur demande (sous réserve des obligations légales)

Je peux demander l''arrêt de l''enregistrement à tout moment pendant la consultation.',
     false,
     ARRAY['Article 9 du RGPD', 'Article L.1110-4 du Code de la santé publique']),
    
    ('ai_analysis'::patient_consent_type,
     'Consentement à l''analyse par intelligence artificielle',
     'Je consens à ce que mes données de santé soient analysées par des outils d''intelligence artificielle (IA) dans le cadre de ma prise en charge médicale.

L''IA est utilisée pour :
• Assister les professionnels de santé dans l''analyse des symptômes
• Proposer des pistes diagnostiques à valider par le médecin
• Faciliter la rédaction des comptes-rendus médicaux

IMPORTANT :
• L''IA est un outil d''aide à la décision, non un substitut au médecin
• Toute suggestion de l''IA est validée par un professionnel de santé qualifié
• La décision médicale finale appartient toujours au médecin
• Mes données sont traitées de manière confidentielle et sécurisée

Je comprends que je peux refuser ce traitement sans impact sur la qualité de mes soins.',
     false,
     ARRAY['Règlement (UE) 2024/1689 sur l''IA', 'Article 22 du RGPD', 'Recommandations HAS sur l''IA en santé']),
    
    ('data_sharing'::patient_consent_type,
     'Consentement au partage de données avec des tiers',
     'Je consens au partage de mes données de santé avec les professionnels et établissements de santé impliqués dans ma prise en charge.

Ce partage concerne :
• Les médecins spécialistes pour avis ou suivi
• Les laboratoires d''analyses médicales
• Les établissements hospitaliers en cas d''hospitalisation
• Les professionnels paramédicaux participant à mes soins

Garanties :
• Seules les données nécessaires à la prise en charge sont partagées
• Tous les destinataires sont soumis au secret médical
• Le partage est tracé et auditable
• Je peux retirer mon consentement à tout moment

Ce consentement ne couvre pas le partage avec des organismes d''assurance ou des employeurs.',
     false,
     ARRAY['Article L.1110-4 du Code de la santé publique', 'Article L.1111-8-1 du Code de la santé publique', 'Décret n°2021-1047 relatif au DMP'])
) AS ct(consent_type, title, content, required_for_care, legal_references)
WHERE (SELECT user_id FROM profiles WHERE structure_id = s.id LIMIT 1) IS NOT NULL
ON CONFLICT (structure_id, consent_type, version) DO NOTHING;

-- 13. Activer realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_consents;