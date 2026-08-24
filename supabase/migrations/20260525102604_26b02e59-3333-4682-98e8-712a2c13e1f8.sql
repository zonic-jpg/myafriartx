DROP POLICY IF EXISTS pane_views_public_insert ON public.pane_views;

CREATE POLICY pane_views_public_insert
ON public.pane_views
FOR INSERT
TO anon, authenticated
WITH CHECK (
  pane_id ~ '^[a-z0-9_-]{1,60}$'
  AND (session_id IS NULL OR length(session_id) BETWEEN 8 AND 128)
);