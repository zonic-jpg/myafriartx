alter table public.artwork_submissions add column if not exists dominant_palette text[];

create or replace function public.copy_submission_palette()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.artwork_id is not null
     and new.dominant_palette is not null
     and array_length(new.dominant_palette,1) > 0 then
    update public.artworks a
       set dominant_palette = new.dominant_palette
     where a.id = new.artwork_id
       and (a.dominant_palette is null or array_length(a.dominant_palette,1) is null);
  end if;
  return new;
end $$;
revoke all on function public.copy_submission_palette() from public, anon, authenticated;

drop trigger if exists artwork_submissions_copy_palette on public.artwork_submissions;
create trigger artwork_submissions_copy_palette
  after insert or update of artwork_id on public.artwork_submissions
  for each row execute function public.copy_submission_palette();
