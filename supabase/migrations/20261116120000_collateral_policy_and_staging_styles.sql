-- Applied live 2026-11-16.
-- 1) Collateral requests are filed as 'pending_auth' (the column default); the insert rule only allowed
--    'pending', so every submission was refused with a security-policy error.
alter policy "own collateral insert" on public.collateral_pledges
  with check ((auth.uid() = user_id) and (status in ('pending_auth', 'pending')) and (reviewed_by is null));

-- 2) The five decor styles the Studio offers now exist in the styles table (same ids as the app's built-in
--    list). Saving a finished render points at a style, and with the table empty that save always failed,
--    which is why "My renders" and the admin Renders tab stayed empty.
insert into public.styles (id, slug, name, description, prompt_fragment, sort_order, is_active) values
  ('a1000001-0001-4000-8000-000000000001', 'modern-gallery', 'Modern gallery', 'Clean white walls, museum spacing, soft daylight.', 'modern gallery aesthetic: clean white or light plaster walls, generous negative space, soft museum daylight, thin dark frame if needed, calm contemporary interior', 10, true),
  ('a1000001-0001-4000-8000-000000000002', 'warm-living', 'Warm living room', 'Lived-in warmth — wood, textiles, soft lamps.', 'warm residential living room: honey wood tones, soft lamp light, inviting textiles, natural shadows, artwork feels collected not staged', 20, true),
  ('a1000001-0001-4000-8000-000000000003', 'minimal-scandi', 'Minimal Scandi', 'Pale wood, airy light, restrained palette.', 'Scandinavian minimal interior: pale oak, airy white walls, restrained palette, plenty of daylight, quiet framing, uncluttered wall plane', 30, true),
  ('a1000001-0001-4000-8000-000000000004', 'bold-afropolitan', 'Bold Afropolitan', 'Rich colour, pattern dialogue, confident placement.', 'Afropolitan interior: rich wall colour or patterned context, confident artwork scale, dialogue with textiles and craft, dramatic but realistic lighting', 40, true),
  ('a1000001-0001-4000-8000-000000000005', 'loft-industrial', 'Loft industrial', 'Brick, concrete, tall windows, urban loft.', 'urban loft: exposed brick or concrete, tall windows, industrial metal accents, large-scale wall placement, cool daylight with soft falloff', 50, true)
on conflict (id) do update set slug = excluded.slug, name = excluded.name, description = excluded.description,
  prompt_fragment = excluded.prompt_fragment, sort_order = excluded.sort_order, is_active = excluded.is_active;
