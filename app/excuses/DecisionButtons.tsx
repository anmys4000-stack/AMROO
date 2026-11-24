"use client";

import { useState } from "react";

// اعتماد عذر أو رفضه، ثم تحديث الصفحة.
export default function DecisionButtons({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "APPROVED" | "REJECTED") {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/excuses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, decision }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("تعذّر الحفظ");
      return;
    }
    window.location.reload();
  }

  return (
    <span>
      <button type="button" disabled={busy} onClick={() => decide("APPROVED")}>
        اعتماد
      </button>
      <button type="button" disabled={busy} onClick={() => decide("REJECTED")}>
        رفض
      </button>
      {error && <span className="error"> {error}</span>}
    </span>
  );
}
