"use client";

import { useState } from "react";

type Visit = { id: string; visitorName: string; date: string; period: number; className: string; note: string | null; status: string };

const STATUS: Record<string, string> = { PENDING: "بانتظار الاعتماد", APPROVED: "معتمدة", REJECTED: "مرفوضة" };

// نموذج طلب زيارة، وأزرار الاعتماد والرفض للوكيل.
export default function VisitsPanel({ canApprove, visits }: { canApprove: boolean; visits: Visit[] }) {
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState(visits);

  async function request(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: fd.get("date"), period: Number(fd.get("period")), className: fd.get("className"), visitorName: fd.get("visitorName"), note: fd.get("note") }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "تعذّر الحفظ");
      return;
    }
    e.currentTarget.reset();
    window.location.reload();
  }

  async function decide(id: string, status: "APPROVED" | "REJECTED") {
    setError(null);
    const res = await fetch("/api/visits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      setError("تعذّر تحديث الزيارة");
      return;
    }
    setItems(items.map((v) => (v.id === id ? { ...v, status } : v)));
  }

  return (
    <>
      {error && <p className="error" role="alert">{error}</p>}
      <form className="card" onSubmit={request}>
        <input name="visitorName" placeholder="اسم الزائر" minLength={2} required />
        <input name="className" placeholder="الفصل" required />
        <input name="date" type="date" dir="ltr" required />
        <select name="period" defaultValue="1">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <option key={n} value={n}>الحصة {n}</option>
          ))}
        </select>
        <input name="note" placeholder="ملاحظة (اختياري)" maxLength={500} />
        <button type="submit">طلب زيارة</button>
      </form>
      <ul className="list">
        {items.map((v) => (
          <li key={v.id} className="card row">
            <span>{v.visitorName} · {v.className} · الحصة {v.period} · <span dir="ltr">{v.date}</span>{v.note ? ` · ${v.note}` : ""}</span>
            <span>
              {STATUS[v.status] ?? v.status}
              {canApprove && v.status === "PENDING" && (
                <>
                  {" "}<button type="button" onClick={() => decide(v.id, "APPROVED")}>اعتماد</button>{" "}
                  <button type="button" onClick={() => decide(v.id, "REJECTED")}>رفض</button>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
