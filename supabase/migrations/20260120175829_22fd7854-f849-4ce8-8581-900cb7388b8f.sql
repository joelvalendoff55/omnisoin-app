-- ===========================================
-- FIX: Add authentication requirement to all SELECT policies
-- Many policies currently allow anonymous access (roles={})
-- ===========================================

-- 1. APPOINTMENTS - Replace policy with authenticated-only
DROP POLICY IF EXISTS "appointments_select_same_structure" ON public.appointments;
CREATE POLICY "appointments_select_same_structure"
ON public.appointments
FOR SELECT
TO authenticated
USING (structure_id = get_user_structure_id(auth.uid()));

-- 2. DOCUMENTS - Replace policy with authenticated-only
DROP POLICY IF EXISTS "Users can view documents in their structure" ON public.documents;
CREATE POLICY "Users can view documents in their structure"
ON public.documents
FOR SELECT
TO authenticated
USING (structure_id = get_user_structure_id(auth.uid()));

-- 3. INBOX_MESSAGES - Replace policy with authenticated-only
DROP POLICY IF EXISTS "Users can view inbox messages in their structure" ON public.inbox_messages;
CREATE POLICY "Users can view inbox messages in their structure"
ON public.inbox_messages
FOR SELECT
TO authenticated
USING (structure_id = get_user_structure_id(auth.uid()));

-- 4. PATIENT_QUEUE - Replace policy with authenticated-only
DROP POLICY IF EXISTS "queue_select_same_structure" ON public.patient_queue;
CREATE POLICY "queue_select_same_structure"
ON public.patient_queue
FOR SELECT
TO authenticated
USING (structure_id = get_user_structure_id(auth.uid()));

-- 5. PATIENT_TRANSCRIPTS - Replace policy with authenticated-only
DROP POLICY IF EXISTS "Users can view transcripts for patients they can access" ON public.patient_transcripts;
CREATE POLICY "Users can view transcripts for patients they can access"
ON public.patient_transcripts
FOR SELECT
TO authenticated
USING (can_access_patient(auth.uid(), patient_id));

-- 6. TASKS - Replace policy with authenticated-only
DROP POLICY IF EXISTS "tasks_select_same_structure" ON public.tasks;
CREATE POLICY "tasks_select_same_structure"
ON public.tasks
FOR SELECT
TO authenticated
USING (structure_id = get_user_structure_id(auth.uid()));

-- 7. TEAM_MEMBERS - Replace policy with authenticated-only
DROP POLICY IF EXISTS "team_members_select_same_structure" ON public.team_members;
CREATE POLICY "team_members_select_same_structure"
ON public.team_members
FOR SELECT
TO authenticated
USING (structure_id = get_user_structure_id(auth.uid()));

-- 8. TRANSCRIPT_SUMMARIES - Replace policy with authenticated-only
DROP POLICY IF EXISTS "Users can view summaries for accessible transcripts" ON public.transcript_summaries;
CREATE POLICY "Users can view summaries for accessible transcripts"
ON public.transcript_summaries
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM patient_transcripts pt
  WHERE pt.id = transcript_summaries.transcript_id
  AND can_access_patient(auth.uid(), pt.patient_id)
));

-- Also update INSERT/UPDATE/DELETE policies that are missing TO authenticated
-- These may have been created without explicit role specification

-- APPOINTMENTS INSERT/UPDATE
DROP POLICY IF EXISTS "appointments_insert_staff" ON public.appointments;
CREATE POLICY "appointments_insert_staff"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (structure_id = get_user_structure_id(auth.uid()));

DROP POLICY IF EXISTS "appointments_update_staff" ON public.appointments;
CREATE POLICY "appointments_update_staff"
ON public.appointments
FOR UPDATE
TO authenticated
USING (structure_id = get_user_structure_id(auth.uid()));

DROP POLICY IF EXISTS "appointments_delete_creator_admin" ON public.appointments;
CREATE POLICY "appointments_delete_creator_admin"
ON public.appointments
FOR DELETE
TO authenticated
USING (structure_id = get_user_structure_id(auth.uid()) AND (created_by = auth.uid() OR has_role(auth.uid(), 'admin')));

-- DOCUMENTS INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Users can insert documents in their structure" ON public.documents;
CREATE POLICY "Users can insert documents in their structure"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (structure_id = get_user_structure_id(auth.uid()));

DROP POLICY IF EXISTS "Users can update documents in their structure" ON public.documents;
CREATE POLICY "Users can update documents in their structure"
ON public.documents
FOR UPDATE
TO authenticated
USING (structure_id = get_user_structure_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete documents" ON public.documents;
CREATE POLICY "Admins can delete documents"
ON public.documents
FOR DELETE
TO authenticated
USING (structure_id = get_user_structure_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- INBOX_MESSAGES INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Admin/coordinator/assistant can insert inbox messages" ON public.inbox_messages;
CREATE POLICY "Admin/coordinator/assistant can insert inbox messages"
ON public.inbox_messages
FOR INSERT
TO authenticated
WITH CHECK (structure_id = get_user_structure_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator') OR has_role(auth.uid(), 'assistant')));

DROP POLICY IF EXISTS "Admin/coordinator/assistant can update inbox messages" ON public.inbox_messages;
CREATE POLICY "Admin/coordinator/assistant can update inbox messages"
ON public.inbox_messages
FOR UPDATE
TO authenticated
USING (structure_id = get_user_structure_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator') OR has_role(auth.uid(), 'assistant')));

DROP POLICY IF EXISTS "Admin can delete inbox messages" ON public.inbox_messages;
CREATE POLICY "Admin can delete inbox messages"
ON public.inbox_messages
FOR DELETE
TO authenticated
USING (structure_id = get_user_structure_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- PATIENT_QUEUE INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "queue_insert_staff" ON public.patient_queue;
CREATE POLICY "queue_insert_staff"
ON public.patient_queue
FOR INSERT
TO authenticated
WITH CHECK (structure_id = get_user_structure_id(auth.uid()));

DROP POLICY IF EXISTS "queue_update_staff" ON public.patient_queue;
CREATE POLICY "queue_update_staff"
ON public.patient_queue
FOR UPDATE
TO authenticated
USING (structure_id = get_user_structure_id(auth.uid()));

DROP POLICY IF EXISTS "queue_delete_admin" ON public.patient_queue;
CREATE POLICY "queue_delete_admin"
ON public.patient_queue
FOR DELETE
TO authenticated
USING (structure_id = get_user_structure_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- PATIENT_TRANSCRIPTS INSERT/UPDATE
DROP POLICY IF EXISTS "Users can insert transcripts in their structure" ON public.patient_transcripts;
CREATE POLICY "Users can insert transcripts in their structure"
ON public.patient_transcripts
FOR INSERT
TO authenticated
WITH CHECK (structure_id = get_user_structure_id(auth.uid()));

DROP POLICY IF EXISTS "Users can update transcripts for patients they can access" ON public.patient_transcripts;
CREATE POLICY "Users can update transcripts for patients they can access"
ON public.patient_transcripts
FOR UPDATE
TO authenticated
USING (can_access_patient(auth.uid(), patient_id));

-- TASKS INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "tasks_insert_staff" ON public.tasks;
CREATE POLICY "tasks_insert_staff"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (structure_id = get_user_structure_id(auth.uid()));

DROP POLICY IF EXISTS "tasks_update_staff" ON public.tasks;
CREATE POLICY "tasks_update_staff"
ON public.tasks
FOR UPDATE
TO authenticated
USING (structure_id = get_user_structure_id(auth.uid()));

DROP POLICY IF EXISTS "tasks_delete_creator_admin" ON public.tasks;
CREATE POLICY "tasks_delete_creator_admin"
ON public.tasks
FOR DELETE
TO authenticated
USING (structure_id = get_user_structure_id(auth.uid()) AND (created_by = auth.uid() OR has_role(auth.uid(), 'admin')));

-- TEAM_MEMBERS INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "team_members_insert_admin_coordinator" ON public.team_members;
CREATE POLICY "team_members_insert_admin_coordinator"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (structure_id = get_user_structure_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator')));

DROP POLICY IF EXISTS "team_members_update" ON public.team_members;
CREATE POLICY "team_members_update"
ON public.team_members
FOR UPDATE
TO authenticated
USING (structure_id = get_user_structure_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator') OR user_id = auth.uid()));

DROP POLICY IF EXISTS "team_members_delete_admin" ON public.team_members;
CREATE POLICY "team_members_delete_admin"
ON public.team_members
FOR DELETE
TO authenticated
USING (structure_id = get_user_structure_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- TRANSCRIPT_SUMMARIES INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Users can insert summaries for accessible transcripts" ON public.transcript_summaries;
CREATE POLICY "Users can insert summaries for accessible transcripts"
ON public.transcript_summaries
FOR INSERT
TO authenticated
WITH CHECK (structure_id = get_user_structure_id(auth.uid()));

DROP POLICY IF EXISTS "Users can update summaries for accessible transcripts" ON public.transcript_summaries;
CREATE POLICY "Users can update summaries for accessible transcripts"
ON public.transcript_summaries
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM patient_transcripts pt
  WHERE pt.id = transcript_summaries.transcript_id
  AND can_access_patient(auth.uid(), pt.patient_id)
));

DROP POLICY IF EXISTS "Admins can delete summaries" ON public.transcript_summaries;
CREATE POLICY "Admins can delete summaries"
ON public.transcript_summaries
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));