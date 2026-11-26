"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// أزرار الصف في سجل المخالفات: طباعة، تعديل الوصف، حذف (بتأكيد داخل الصف دون نافذة منبثقة).
export default function ViolationRowActions({ id, description }: { id: string; description: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(description);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/behavior/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: text }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "تعذّر الحفظ");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/behavior/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "تعذّر الحذف");
      return;
    }
    router.refresh();
  }

  if (editing) {
    return (
      <div style={{ display: "grid", gap: 6, minWidth: 220 }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000} />
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={save} disabled={busy || text.trim().length < 3}>حفظ</button>
          <button type="button" onClick={() => { setEditing(false); setText(description); }} disabled={busy}>إلغاء</button>
        </div>
        {error && <small className="error">{error}</small>}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <a href={`/violation-cases/print/${id}`} target="_blank" rel="noreferrer">طباعة</a>
        <button type="button" onClick={() => setEditing(true)} disabled={busy}>تعديل</button>
        {confirming ? (
          <>
            <button type="button" onClick={remove} disabled={busy}>تأكيد الحذف</button>
            <button type="button" onClick={() => setConfirming(false)} disabled={busy}>تراجع</button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} disabled={busy}>حذف</button>
        )}
      </div>
      {error && <small className="error">{error}</small>}
    </div>
  );
}
