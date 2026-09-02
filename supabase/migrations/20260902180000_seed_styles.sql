-- Seed active ArtStage styles (idempotent by slug).
insert into public.styles (slug, name, description, prompt_fragment, sort_order, is_active)
values
  (
    'modern-gallery',
    'Modern gallery',
    'Clean white walls, museum spacing, soft daylight.',
    'modern gallery aesthetic: clean white or light plaster walls, generous negative space, soft museum daylight, thin dark frame if needed, calm contemporary interior',
    10,
    true
  ),
  (
    'warm-living',
    'Warm living room',
    'Lived-in warmth — wood, textiles, soft lamps.',
    'warm residential living room: honey wood tones, soft lamp light, inviting textiles, natural shadows, artwork feels collected not staged',
    20,
    true
  ),
  (
    'minimal-scandi',
    'Minimal Scandi',
    'Pale wood, airy light, restrained palette.',
    'Scandinavian minimal interior: pale oak, airy white walls, restrained palette, plenty of daylight, quiet framing, uncluttered wall plane',
    30,
    true
  ),
  (
    'bold-afropolitan',
    'Bold Afropolitan',
    'Rich colour, pattern dialogue, confident placement.',
    'Afropolitan interior: rich wall colour or patterned context, confident artwork scale, dialogue with textiles and craft, dramatic but realistic lighting',
    40,
    true
  ),
  (
    'loft-industrial',
    'Loft industrial',
    'Brick, concrete, tall windows, urban loft.',
    'urban loft: exposed brick or concrete, tall windows, industrial metal accents, large-scale wall placement, cool daylight with soft falloff',
    50,
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  prompt_fragment = excluded.prompt_fragment,
  sort_order = excluded.sort_order,
  is_active = true;
