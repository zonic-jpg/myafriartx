import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Shows how many demonstration Sale Lounge listings exist and removes them all in one step. */
export function DemoListingsPanel() {
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const { data, error } = await (supabase as any).rpc("admin_demo_listings_count");
    if (!error && typeof data === "number") setCount(data);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const removeAll = async () => {
    if (!window.confirm(`Remove all ${count} demo listings (and their threads)? Real listings stay. This cannot be undone.`)) return;
    setBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc("admin_remove_demo_listings");
      if (error) throw new Error(error.message);
      toast.success(`Removed ${data} demo listing${data === 1 ? "" : "s"}`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove demo listings");
    } finally {
      setBusy(false);
    }
  };

  if (count === null) return null;
  return (
    <div className="mb-4 rounded-md border border-border p-3">
      <p className="text-sm font-medium">Demo content</p>
      <p className="mb-2 text-xs text-muted-foreground">
        The Sale Lounge currently shows <b>{count}</b> demo listing{count === 1 ? "" : "s"}, each labelled "Demo" so the flow can be demonstrated.
        New listings from real members are never marked demo.
      </p>
      <button
        type="button"
        disabled={busy || count === 0}
        onClick={() => void removeAll()}
        className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-60"
      >
        {busy ? "Removing…" : "Remove all demo listings"}
      </button>
    </div>
  );
}
