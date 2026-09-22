-- The staging pipeline (src/lib/stage-room.functions.ts and
-- netlify/functions/stage-room.mjs) writes renders.source_image_url and
-- renders.result_image_url as bare storage paths, e.g. "<user_id>/<uuid>.jpg"
-- -- not full URLs -- because the "rooms" and "renders" buckets are private
-- and a signed URL is only valid for one hour. The read side
-- (signRenderImageUrls / createPrivateImageUrl in src/lib/render-urls.server.ts)
-- is built around that: it takes the stored bare path and re-signs a fresh
-- URL on every read.
--
-- The 2026-05-27 hardening migration (20260527132124) added a
-- `source_image_url LIKE 'https://%'` CHECK constraint to this table. Every
-- insert from the staging pipeline writes a bare path, so it violates that
-- constraint on every single render. Both call sites treat the insert as a
-- soft failure (log and fall back to an ephemeral, unsaved result), so the
-- user sees their render on screen but it silently never reaches the
-- `renders` table -- this is why past renders never show up in "My renders".
--
-- Relax the constraint to accept either a full https URL or a bare,
-- schemeless storage path, while still rejecting any other URL scheme
-- (http, ftp, javascript, etc.) so the original intent (no non-https
-- external URLs) is preserved.
ALTER TABLE public.renders DROP CONSTRAINT IF EXISTS renders_source_image_url_https;
ALTER TABLE public.renders
  ADD CONSTRAINT renders_source_image_url_https
  CHECK (
    source_image_url LIKE 'https://%'
    OR source_image_url !~ '^[a-zA-Z][a-zA-Z0-9+.-]*://'
  ) NOT VALID;
ALTER TABLE public.renders VALIDATE CONSTRAINT renders_source_image_url_https;

ALTER TABLE public.renders DROP CONSTRAINT IF EXISTS renders_result_image_url_https;
ALTER TABLE public.renders
  ADD CONSTRAINT renders_result_image_url_https
  CHECK (
    result_image_url IS NULL
    OR result_image_url LIKE 'https://%'
    OR result_image_url !~ '^[a-zA-Z][a-zA-Z0-9+.-]*://'
  ) NOT VALID;
ALTER TABLE public.renders VALIDATE CONSTRAINT renders_result_image_url_https;
