import { useState } from "react";
import {
  AWAITING_MSG,
  OWNER_EMAIL,
  approveAdmin,
  listApprovedAdmins,
  listPendingQueue,
  revokeAdmin,
} from "@/lib/adminTesterApproval";

export function AdminTesterQueue() {
  const [tick, setTick] = useState(0);
  const pending = listPendingQueue("myafriartx");
  const approved = listApprovedAdmins();
  const bump = () => setTick((n) => n + 1);

  return (
    <div id="admintester-queue" className="mb-6 rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-sm scroll-mt-24" key={tick}>
      <h2 className="font-semibold">ADMINTESTER approvals</h2>
      <p className="text-muted-foreground text-xs mt-1">{AWAITING_MSG}</p>
      {pending.length === 0 ? (
        <p className="text-muted-foreground mt-2">No pending requests.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {pending.map((p) => (
            <li key={`${p.email}-${p.requestedAt}`} className="flex items-center justify-between gap-2">
              <span>
                {p.identity || p.email}
                <span className="block text-xs text-muted-foreground">{new Date(p.requestedAt).toLocaleString()}</span>
              </span>
              <button
                type="button"
                className="rounded bg-primary px-3 py-1 text-primary-foreground text-xs"
                onClick={() => {
                  approveAdmin(OWNER_EMAIL, p.email);
                  bump();
                }}
              >
                Approve
              </button>
            </li>
          ))}
        </ul>
      )}
      {approved.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <p className="font-medium">Approved</p>
          {approved.map((a) => (
            <div key={a.email} className="flex items-center justify-between py-1">
              <span>{a.email}</span>
              <button
                type="button"
                className="text-xs text-destructive"
                onClick={() => {
                  revokeAdmin(OWNER_EMAIL, a.email);
                  bump();
                }}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
