-- Add manual_order column to patient_queue for drag & drop reordering
ALTER TABLE public.patient_queue 
ADD COLUMN IF NOT EXISTS manual_order INTEGER;

-- Create index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_patient_queue_manual_order 
ON public.patient_queue (structure_id, manual_order) 
WHERE manual_order IS NOT NULL;

-- Function to update queue order after drag & drop
CREATE OR REPLACE FUNCTION public.update_queue_order(
  p_structure_id UUID,
  p_ordered_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i INTEGER;
BEGIN
  -- Update each entry with its new position
  FOR i IN 1..array_length(p_ordered_ids, 1) LOOP
    UPDATE patient_queue 
    SET manual_order = i
    WHERE id = p_ordered_ids[i] 
    AND structure_id = p_structure_id;
  END LOOP;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.update_queue_order(UUID, UUID[]) TO authenticated;