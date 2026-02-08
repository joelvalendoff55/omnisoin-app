-- Fix log_team_member_activity to handle NULL auth.uid()
CREATE OR REPLACE FUNCTION public.log_team_member_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor_user_id UUID;
BEGIN
  -- Get authenticated user or use a system user placeholder
  v_actor_user_id := auth.uid();
  
  -- Skip logging if no authenticated user (admin/system operations)
  IF v_actor_user_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (structure_id, actor_user_id, action, metadata)
    VALUES (NEW.structure_id, v_actor_user_id, 'team_member_created', jsonb_build_object('team_member_id', NEW.id, 'job_title', NEW.job_title));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_logs (structure_id, actor_user_id, action, metadata)
    VALUES (NEW.structure_id, v_actor_user_id, 'team_member_updated', jsonb_build_object('team_member_id', NEW.id, 'job_title', NEW.job_title));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_logs (structure_id, actor_user_id, action, metadata)
    VALUES (OLD.structure_id, v_actor_user_id, 'team_member_deleted', jsonb_build_object('team_member_id', OLD.id, 'job_title', OLD.job_title));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;