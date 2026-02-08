-- Create patient_accounts table for patient portal authentication
CREATE TABLE public.patient_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  access_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(patient_id),
  UNIQUE(email)
);

-- Create patient_messages table for secure messaging
CREATE TABLE public.patient_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  direction TEXT NOT NULL CHECK (direction IN ('patient_to_practitioner', 'practitioner_to_patient')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  structure_id UUID REFERENCES public.structures(id) ON DELETE CASCADE
);

-- Create patient_documents table
CREATE TABLE public.patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('ordonnance', 'resultat', 'certificat', 'compte_rendu', 'autre')),
  category TEXT,
  file_url TEXT,
  file_path TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  structure_id UUID REFERENCES public.structures(id) ON DELETE CASCADE
);

-- Enable RLS on all tables
ALTER TABLE public.patient_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

-- Create function to verify patient access code
CREATE OR REPLACE FUNCTION public.verify_patient_access(
  _email TEXT,
  _access_code TEXT
)
RETURNS TABLE (
  patient_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pa.patient_id,
    p.first_name,
    p.last_name,
    pa.email
  FROM public.patient_accounts pa
  JOIN public.patients p ON p.id = pa.patient_id
  WHERE LOWER(pa.email) = LOWER(_email)
    AND pa.access_code = _access_code
    AND pa.is_active = true;
  
  -- Update last_login if found
  UPDATE public.patient_accounts
  SET last_login = now()
  WHERE LOWER(email) = LOWER(_email) AND access_code = _access_code;
END;
$$;

-- Create function to get patient messages (security definer to bypass RLS for patient portal)
CREATE OR REPLACE FUNCTION public.get_patient_messages(_patient_id UUID)
RETURNS TABLE (
  id UUID,
  patient_id UUID,
  practitioner_id UUID,
  practitioner_name TEXT,
  subject TEXT,
  content TEXT,
  is_read BOOLEAN,
  direction TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.id,
    pm.patient_id,
    pm.practitioner_id,
    COALESCE(pr.full_name, 'Équipe médicale') as practitioner_name,
    pm.subject,
    pm.content,
    pm.is_read,
    pm.direction,
    pm.created_at,
    pm.read_at
  FROM public.patient_messages pm
  LEFT JOIN public.profiles pr ON pr.id = pm.practitioner_id
  WHERE pm.patient_id = _patient_id
  ORDER BY pm.created_at DESC;
END;
$$;

-- Create function to send patient message
CREATE OR REPLACE FUNCTION public.send_patient_message(
  _patient_id UUID,
  _subject TEXT,
  _content TEXT,
  _structure_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _message_id UUID;
BEGIN
  INSERT INTO public.patient_messages (
    patient_id,
    subject,
    content,
    direction,
    structure_id
  ) VALUES (
    _patient_id,
    _subject,
    _content,
    'patient_to_practitioner',
    _structure_id
  )
  RETURNING id INTO _message_id;
  
  RETURN _message_id;
END;
$$;

-- Create function to get patient documents
CREATE OR REPLACE FUNCTION public.get_patient_documents(_patient_id UUID)
RETURNS TABLE (
  id UUID,
  patient_id UUID,
  title TEXT,
  description TEXT,
  type TEXT,
  category TEXT,
  file_url TEXT,
  file_size INTEGER,
  uploaded_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pd.id,
    pd.patient_id,
    pd.title,
    pd.description,
    pd.type,
    pd.category,
    pd.file_url,
    pd.file_size,
    COALESCE(pd.uploaded_by_name, pr.full_name, 'Équipe médicale') as uploaded_by_name,
    pd.created_at
  FROM public.patient_documents pd
  LEFT JOIN public.profiles pr ON pr.id = pd.uploaded_by
  WHERE pd.patient_id = _patient_id
  ORDER BY pd.created_at DESC;
END;
$$;

-- Create function to get patient appointments
CREATE OR REPLACE FUNCTION public.get_patient_appointments(_patient_id UUID)
RETURNS TABLE (
  id UUID,
  patient_id UUID,
  practitioner_id UUID,
  practitioner_name TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  title TEXT,
  appointment_type TEXT,
  status TEXT,
  location TEXT,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.patient_id,
    a.practitioner_id,
    COALESCE(pr.full_name, 'Praticien') as practitioner_name,
    a.start_time,
    a.end_time,
    a.title,
    a.appointment_type,
    a.status,
    a.location,
    a.notes
  FROM public.appointments a
  LEFT JOIN public.profiles pr ON pr.id = a.practitioner_id
  WHERE a.patient_id = _patient_id
  ORDER BY a.start_time DESC;
END;
$$;

-- Create function to get patient info
CREATE OR REPLACE FUNCTION public.get_patient_info(_patient_id UUID)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  dob TEXT,
  sex TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    pa.email,
    p.phone,
    p.dob,
    p.sex
  FROM public.patients p
  JOIN public.patient_accounts pa ON pa.patient_id = p.id
  WHERE p.id = _patient_id;
END;
$$;

-- RLS Policies for patient_accounts (practitioners can manage)
CREATE POLICY "Practitioners can view patient accounts in their structure"
  ON public.patient_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.org_members om ON om.structure_id = p.structure_id
      WHERE p.id = patient_accounts.patient_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can create patient accounts in their structure"
  ON public.patient_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.org_members om ON om.structure_id = p.structure_id
      WHERE p.id = patient_accounts.patient_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can update patient accounts in their structure"
  ON public.patient_accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.org_members om ON om.structure_id = p.structure_id
      WHERE p.id = patient_accounts.patient_id
        AND om.user_id = auth.uid()
    )
  );

-- RLS Policies for patient_messages (practitioners can manage messages in their structure)
CREATE POLICY "Practitioners can view messages in their structure"
  ON public.patient_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.structure_id = patient_messages.structure_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can send messages to patients"
  ON public.patient_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    direction = 'practitioner_to_patient'
    AND EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.structure_id = patient_messages.structure_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can update message read status"
  ON public.patient_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.structure_id = patient_messages.structure_id
        AND om.user_id = auth.uid()
    )
  );

-- RLS Policies for patient_documents (practitioners can manage)
CREATE POLICY "Practitioners can view patient documents in their structure"
  ON public.patient_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.structure_id = patient_documents.structure_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can upload patient documents"
  ON public.patient_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.structure_id = patient_documents.structure_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can delete patient documents"
  ON public.patient_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.structure_id = patient_documents.structure_id
        AND om.user_id = auth.uid()
    )
  );

-- Enable realtime for patient messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_messages;

-- Create indexes for performance
CREATE INDEX idx_patient_accounts_email ON public.patient_accounts(LOWER(email));
CREATE INDEX idx_patient_accounts_patient_id ON public.patient_accounts(patient_id);
CREATE INDEX idx_patient_messages_patient_id ON public.patient_messages(patient_id);
CREATE INDEX idx_patient_messages_created_at ON public.patient_messages(created_at DESC);
CREATE INDEX idx_patient_documents_patient_id ON public.patient_documents(patient_id);
CREATE INDEX idx_patient_documents_type ON public.patient_documents(type);