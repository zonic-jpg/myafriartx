"use client";

import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  adminListBrokerRequests,
  adminUpdateBrokerRequest,
  adminIssueCertificate,
} from "@/lib/lounge.functions";

export function BrokerageAdmin() {
  const listFn = useServerFn(adminListBrokerRequests);
  const updateFn = useServerFn(adminUpdateBrokerRequest);
  const certFn = useServerFn(adminIssueCertificate);
  const qc = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin", "brokerage"],
    queryFn: () => listFn(),
  });

  const [notes, setNotes] = useState<Record<string, string>>({});
  const [verifyCodes, setVerifyCodes] = useState<Record<string, string>>({});

  async function setStatus(id: string, status: string) {
    try {
      await updateFn({ data: { id, status: status as any, admin_notes: notes[id] } });
      toast.success(`Updated to ${status}`);
      qc.invalidateQueries({ queryKey: ["admin", "brokerage"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function issueCert(id: string) {
    try {
      const res = await certFn({ data: { id } });
      if (res?.verifyCode) setVerifyCodes((v) => ({ ...v, [id]: res.verifyCode }));
      toast.success("Certificate issued");
      qc.invalidateQueries({ queryKey: ["admin", "brokerage"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Certificate failed");
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading brokerage queue…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Approve authentication workflow before certificates reach buyers. Issue cert when status is
        verified/delivered.
      </p>
      {requests.map((r: Record<string, unknown>) => (
        <div key={String(r.id)} className="rounded-lg border border-border p-4 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <p className="font-medium">{String(r.listing_title)}</p>
              <p className="text-muted-foreground">
                {String(r.buyer_name)} ↔ {String(r.seller_name)} · {String(r.status)}
              </p>
            </div>
            <span className="text-xs uppercase text-muted-foreground">
              {String(r.currency)} {String(r.transaction_amount ?? "—")}
            </span>
          </div>
          <textarea
            className="mt-3 w-full rounded border border-border bg-background px-3 py-2 text-sm"
            rows={2}
            placeholder="Admin notes"
            value={notes[String(r.id)] ?? ""}
            onChange={(e) => setNotes((n) => ({ ...n, [String(r.id)]: e.target.value }))}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              "accepted",
              "verified",
              "in_transit",
              "delivered",
              "certified",
              "rejected",
              "closed",
            ].map((s) => (
              <button
                key={s}
                type="button"
                className="rounded border border-border px-2 py-1 text-xs capitalize hover:bg-muted"
                onClick={() => setStatus(String(r.id), s)}
              >
                {s}
              </button>
            ))}
            <button
              type="button"
              className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground"
              onClick={() => issueCert(String(r.id))}
            >
              Issue certificate
            </button>
          </div>
          {verifyCodes[String(r.id)] && (
            <p className="mt-2 text-xs text-muted-foreground">
              Verify:{" "}
              <a
                href={`/verify/cert/${verifyCodes[String(r.id)]}`}
                className="text-primary underline"
                target="_blank"
                rel="noreferrer"
              >
                /verify/cert/{verifyCodes[String(r.id)]}
              </a>
            </p>
          )}
        </div>
      ))}
      {requests.length === 0 && (
        <p className="text-sm text-muted-foreground">No brokerage requests yet.</p>
      )}
    </div>
  );
}
