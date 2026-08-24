DROP POLICY IF EXISTS settings_read_anon ON public.app_settings;

CREATE POLICY settings_read_anon
ON public.app_settings
FOR SELECT
TO anon
USING (key IN ('broker_fee_percent', 'mock_catalogue_enabled'));