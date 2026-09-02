-- Content Intake: public-read storage bucket for staged images.
insert into storage.buckets (id, name, public)
values ('content-intake', 'content-intake', true)
on conflict (id) do nothing;
-- Uploads are performed server-side with the service role (RLS bypassed), so no
-- INSERT policy is required. Public read is enabled via the bucket's public flag.
