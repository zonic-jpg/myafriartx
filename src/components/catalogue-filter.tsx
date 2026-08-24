import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type CatalogueFilters = {
  q: string;
  countries: string[];
  mediums: string[];
  genders: string[];
  cities: string[];
  artists: string[];
  ageRange: [number, number] | null;
  priceRange: [number, number] | null;
};

export const EMPTY_FILTERS: CatalogueFilters = {
  q: "",
  countries: [],
  mediums: [],
  genders: [],
  cities: [],
  artists: [],
  ageRange: null,
  priceRange: null,
};

export type FacetOptions = {
  countries: string[];
  mediums: string[];
  genders: string[];
  cities: string[];
  artists: string[];
  ageBounds: [number, number];
  priceBounds: [number, number];
};

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function MultiChip({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const allOptions = useMemo(() => ["ALL", ...options], [options]);
  const filtered = useMemo(
    () =>
      query ? allOptions.filter((o) => o.toLowerCase().includes(query.toLowerCase())) : allOptions,
    [allOptions, query],
  );
  const count = selected.length;

  const handleToggle = (opt: string) => {
    if (opt === "ALL") {
      onChange([]);
      return;
    }
    let next = toggle(selected, opt);
    if (next.includes("ALL")) {
      next = next.filter((v) => v !== "ALL");
    }
    onChange(next);
  };

  const isCountry = label === "Country";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`group inline-flex items-center gap-2 rounded-md border-2 px-4 py-2 text-xs font-semibold transition ${
            count > 0
              ? "border-primary bg-primary/10 text-primary"
              : "border-foreground/40 bg-card text-foreground hover:border-foreground"
          }`}
        >
          <span>{label}</span>
          {count > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
              {count}
            </span>
          )}
          <span className="text-muted-foreground" aria-hidden>
            ⌄
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className={isCountry ? "w-[28rem] p-0" : "w-64 p-0"}>
        <div className="border-b border-border p-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}...`}
            className="h-8 text-xs"
          />
        </div>
        <div
          className={`max-h-72 overflow-y-auto p-2 ${isCountry ? "grid grid-cols-2 gap-x-4 gap-y-1" : ""}`}
        >
          {filtered.length === 0 && (
            <p className="col-span-full px-3 py-4 text-center text-xs text-muted-foreground">
              No options
            </p>
          )}
          {filtered.map((opt) => {
            const checked = opt === "ALL" ? count === 0 : selected.includes(opt);
            return (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
              >
                <Checkbox checked={checked} onCheckedChange={() => handleToggle(opt)} />
                <span className="flex-1 truncate text-left">{opt}</span>
              </label>
            );
          })}
        </div>
        {count > 0 && (
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full text-xs"
              onClick={() => onChange([])}
            >
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function RangeChip({
  label,
  bounds,
  value,
  step,
  format,
  onChange,
}: {
  label: string;
  bounds: [number, number];
  value: [number, number] | null;
  step?: number;
  format: (n: number) => string;
  onChange: (next: [number, number] | null) => void;
}) {
  const current: [number, number] = value ?? bounds;
  const active = value !== null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-2 rounded-md border-2 px-4 py-2 text-xs font-semibold transition ${
            active
              ? "border-primary bg-primary/10 text-primary"
              : "border-foreground/40 bg-card text-foreground hover:border-foreground"
          }`}
        >
          <span>{label}</span>
          {active && (
            <span className="text-[10px] font-normal text-muted-foreground">
              {format(current[0])}–{format(current[1])}
            </span>
          )}
          <span className="text-muted-foreground" aria-hidden>
            ⌄
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-4">
        <div className="mb-3 flex items-center justify-between text-xs">
          <span className="font-medium">{label}</span>
          <span className="text-muted-foreground">
            {format(current[0])} – {format(current[1])}
          </span>
        </div>
        <Slider
          min={bounds[0]}
          max={bounds[1]}
          step={step ?? 1}
          value={current}
          onValueChange={(v) => onChange([v[0], v[1]] as [number, number])}
        />
        {active && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 h-7 w-full text-xs"
            onClick={() => onChange(null)}
          >
            Clear
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function CatalogueFilter({
  filters,
  facets,
  onChange,
}: {
  filters: CatalogueFilters;
  facets: FacetOptions;
  onChange: (next: CatalogueFilters) => void;
}) {
  const set = <K extends keyof CatalogueFilters>(key: K, value: CatalogueFilters[K]) =>
    onChange({ ...filters, [key]: value });

  const hasAny =
    filters.q ||
    filters.countries.length ||
    filters.mediums.length ||
    filters.genders.length ||
    filters.cities.length ||
    filters.ageRange ||
    filters.priceRange;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-md border-2 border-foreground/40 bg-card px-4 py-2 sm:max-w-xs">
        <span className="text-muted-foreground" aria-hidden>
          ⌕
        </span>
        <input
          value={filters.q}
          onChange={(e) => set("q", e.target.value)}
          placeholder="Search by name..."
          aria-label="Search catalogue by artist or artwork name"
          className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        />
        {filters.q && (
          <button
            type="button"
            aria-label="Clear name search"
            onClick={() => set("q", "")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        )}
      </div>

      <MultiChip
        label="Country"
        options={facets.countries}
        selected={filters.countries}
        onChange={(v) => set("countries", v)}
      />
      <MultiChip
        label="Medium"
        options={facets.mediums}
        selected={filters.mediums}
        onChange={(v) => set("mediums", v)}
      />
      <MultiChip
        label="Gender"
        options={facets.genders}
        selected={filters.genders}
        onChange={(v) => set("genders", v)}
      />
      <MultiChip
        label="City"
        options={facets.cities}
        selected={filters.cities}
        onChange={(v) => set("cities", v)}
      />
      <RangeChip
        label="Age"
        bounds={facets.ageBounds}
        value={filters.ageRange}
        format={(n) => {
          const year = new Date().getFullYear() - n;
          if (n === 0) return `<1 yr · ${year}`;
          if (n === 1) return `1 yr · ${year}`;
          return `${n} yrs · ${year}`;
        }}
        onChange={(v) => set("ageRange", v)}
      />
      <RangeChip
        label="Price"
        bounds={facets.priceBounds}
        value={filters.priceRange}
        step={50}
        format={(n) => `$${n.toLocaleString()}`}
        onChange={(v) => set("priceRange", v)}
      />

      {hasAny && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="ml-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Reset all
        </button>
      )}
    </div>
  );
}
