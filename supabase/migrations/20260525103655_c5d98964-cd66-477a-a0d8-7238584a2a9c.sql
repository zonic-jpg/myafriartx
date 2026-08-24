CREATE TABLE public.entry_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_point TEXT NOT NULL,
  location TEXT NOT NULL,
  session_id TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.entry_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow insert entry clicks" ON public.entry_clicks
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can read all entry clicks" ON public.entry_clicks
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_entry_clicks_entry_point ON public.entry_clicks(entry_point);
CREATE INDEX idx_entry_clicks_created_at ON public.entry_clicks(created_at DESC);
CREATE INDEX idx_entry_clicks_location ON public.entry_clicks(location);