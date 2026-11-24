"use client";

import { FormEvent, useState } from "react";

type Leave = {
  id: string;
  teacher: string;
  date: string;
  leaveAt: string;
  returnAt: string;
  reason: string;
  coverage: string | null;
  status: string;
  pending: boolean;
};

// طلب استئذان جديد، وقائمة الطلبات مع الاعتماد أو الرفض لمن يملك الصلاحية.
export default function LeavePanel({ leaves, canDecide }: { leaves: Leave[]; canDecide: boolean }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [leaveAt, setLeaveAt] = useState("10:00");
  const [returnAt, setReturnAt] = useState("11:00");
  const [reason, setReason] = useState("");
  const [coverage, setCoverage] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function request(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const res = await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, leaveAt, returnAt, reason }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر تقديم الطلب");
      return;
    }
    window.location.reload();
  }

  async function decide(id: string, decision: "APPROVED" | "REJECTED") {
    setError(null);
    const res = await fetch("/api/leave", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, decision, coverage: coverage[id] ?? "" }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر الحفظ");
      return;
    }
    window.location.reload();
  }

  return (
    <>
      <form className="card" onSubmit={request}>
        <h2>طلب استئذان</h2>
        <label>التاريخ</label>
        <input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} required />
        <label>وقت الخروج</label>
        <input type="time" dir="ltr" value={leaveAt} onChange={(e) => setLeaveAt(e.target.value)} required />
        <label>وقت العودة</label>
        <input type="time" dir="ltr" value={returnAt} onChange={(e) => setReturnAt(e.target.value)} required />
        <label>السبب</label>
        <input value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} maxLength={300} />
        <button type="submit">إرسال الطلب</button>
      </form>

      {error && <p className="error" role="alert">{error}</p>}

      <ul className="list">
        {leaves.map((l) => (
          <li key={l.id} className="card">
            <strong>{l.teacher}</strong> · <span dir="ltr">{l.date}</span> · <span dir="ltr">{l.leaveAt} - {l.returnAt}</span>
            <p>{l.reason}</p>
            <p>الحالة: {l.status}</p>
            {l.coverage && <p>تأمين الحصص: {l.coverage}</p>}
            {canDecide && l.pending && (
              <div>
                <input
                  placeholder="تأمين الحصص (اختياري)"
                  value={coverage[l.id] ?? ""}
                  onChange={(e) => setCoverage({ ...coverage, [l.id]: e.target.value })}
                />
                <button type="button" onClick={() => decide(l.id, "APPROVED")}>
                  اعتماد
                </button>
                <button type="button" onClick={() => decide(l.id, "REJECTED")}>
                  رفض
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
