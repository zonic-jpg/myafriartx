import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { deleteLiveEvent, listLiveEvents, saveLiveEvent, type LiveEvent } from "@/lib/events.functions";

const emptyForm = (): Partial<LiveEvent> => ({
  title: "",
  description: "",
  detail_text: "",
  venue: "",
  city: "",
  country: "",
  starts_at: "",
  ends_at: "",
  image_url: "/media/pane-event.jpg",
  detail_image_url: "",
  detail_video_url: "",
  ticket_url: "",
  category: "",
  tags: [],
  status: "published",
});

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventsAdmin() {
  const qc = useQueryClient();
  const fetchEvents = useServerFn(listLiveEvents);
  const saveEvent = useServerFn(saveLiveEvent);
  const removeEvent = useServerFn(deleteLiveEvent);
  const [form, setForm] = useState<Partial<LiveEvent>>(emptyForm);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["live-events", "admin"],
    queryFn: () => fetchEvents({ data: { includeDrafts: true } }),
  });

  const saveMut = useMutation({
    mutationFn: (payload: Partial<LiveEvent>) => saveEvent({ data: payload as never }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live-events"] });
      setForm(emptyForm());
      toast.success("Event saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => removeEvent({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live-events"] });
      toast.success("Event deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title?.trim()) {
      toast.error("Title required");
      return;
    }
    saveMut.mutate({
      ...form,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      tags: form.tags ?? [],
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Live events</h3>
        <p className="text-sm text-muted-foreground">
          Published events appear on the public <code>/events</code> calendar. Drafts stay admin-only.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border border-border p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Title
            <input
              className="rounded border border-border bg-background px-3 py-2"
              value={form.title ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </label>
          <label className="grid gap-1 text-sm">
            Category
            <input
              className="rounded border border-border bg-background px-3 py-2"
              value={form.category ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="Art Fair, Gallery Opening…"
            />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm">
            Venue
            <input
              className="rounded border border-border bg-background px-3 py-2"
              value={form.venue ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
            />
          </label>
          <label className="grid gap-1 text-sm">
            City
            <input
              className="rounded border border-border bg-background px-3 py-2"
              value={form.city ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Country
            <input
              className="rounded border border-border bg-background px-3 py-2"
              value={form.country ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Starts
            <input
              type="datetime-local"
              className="rounded border border-border bg-background px-3 py-2"
              value={toLocalInput(form.starts_at)}
              onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Ends
            <input
              type="datetime-local"
              className="rounded border border-border bg-background px-3 py-2"
              value={toLocalInput(form.ends_at)}
              onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
            />
          </label>
        </div>
        <label className="grid gap-1 text-sm">
          Card summary
          <textarea
            className="min-h-[72px] rounded border border-border bg-background px-3 py-2"
            value={form.description ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Detail text
          <textarea
            className="min-h-[96px] rounded border border-border bg-background px-3 py-2"
            value={form.detail_text ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, detail_text: e.target.value }))}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Poster image URL
          <input
            className="rounded border border-border bg-background px-3 py-2"
            value={form.image_url ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
            placeholder="/media/pane-event.jpg"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Ticket URL
          <input
            className="rounded border border-border bg-background px-3 py-2"
            value={form.ticket_url ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, ticket_url: e.target.value }))}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Tags (comma-separated)
          <input
            className="rounded border border-border bg-background px-3 py-2"
            value={(form.tags ?? []).join(", ")}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                tags: e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              }))
            }
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <select
            className="rounded border border-border bg-background px-3 py-2"
            value={form.status ?? "published"}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as LiveEvent["status"] }))}
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <div className="flex gap-2">
          <button type="submit" className="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={saveMut.isPending}>
            {form.id ? "Update event" : "Create event"}
          </button>
          {form.id ? (
            <button type="button" className="rounded border border-border px-4 py-2" onClick={() => setForm(emptyForm())}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading events…</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {events.map((ev) => (
            <li key={ev.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <div className="font-medium">{ev.title}</div>
                <div className="text-muted-foreground">
                  {[ev.city, ev.country, new Date(ev.starts_at).toLocaleDateString()].filter(Boolean).join(" · ")}
                  {ev.status !== "published" ? ` · ${ev.status}` : ""}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" className="rounded border border-border px-3 py-1" onClick={() => setForm(ev)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="rounded border border-destructive px-3 py-1 text-destructive"
                  onClick={() => {
                    if (confirm(`Delete “${ev.title}”?`)) deleteMut.mutate(ev.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {!events.length && <li className="px-4 py-6 text-sm text-muted-foreground">No events yet.</li>}
        </ul>
      )}
    </div>
  );
}
