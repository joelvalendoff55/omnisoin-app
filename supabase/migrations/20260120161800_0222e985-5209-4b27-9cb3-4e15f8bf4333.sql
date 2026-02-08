-- Ajouter les colonnes de suivi au parcours dans patient_queue
-- Note: called_at et completed_at existent déjà
ALTER TABLE patient_queue ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE patient_queue ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE patient_queue ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id);

-- Table des étapes du parcours
CREATE TABLE IF NOT EXISTS patient_journey_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_entry_id UUID NOT NULL REFERENCES patient_queue(id) ON DELETE CASCADE,
  step_type TEXT NOT NULL CHECK (step_type IN ('arrival', 'waiting', 'called', 'in_progress', 'completed', 'cancelled', 'no_show')),
  step_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  performed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE patient_journey_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journey_steps_select_same_structure" ON patient_journey_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patient_queue pq
      WHERE pq.id = queue_entry_id
      AND pq.structure_id = get_user_structure_id(auth.uid())
    )
  );

CREATE POLICY "journey_steps_insert_same_structure" ON patient_journey_steps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM patient_queue pq
      WHERE pq.id = queue_entry_id
      AND pq.structure_id = get_user_structure_id(auth.uid())
    )
  );

CREATE INDEX idx_journey_steps_queue ON patient_journey_steps(queue_entry_id);
CREATE INDEX idx_journey_steps_step_at ON patient_journey_steps(step_at DESC);

-- Enable realtime for journey steps
ALTER PUBLICATION supabase_realtime ADD TABLE patient_journey_steps;