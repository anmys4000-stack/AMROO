"use client";

import { FormEvent, useState } from "react";

type Student = { id: string; fullName: string };
type Referral = { id: string; studentName: string; reason: string; action: string | null; status: string; date: string };

// نموذج الإحالة الجديدة، وقائمة الإحالات مع معالجة المفتوحة منها.
export default function ReferralPanel({ students, referrals, canHandle }: { students: Student[]; referrals: Referral[]; canHandle: boolean }) {
  const [studentId, setStudentId] = useState("");
  const [reason, setReason] = useState("");
  const [actions, setActions] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const res = await fetch("/api/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, reason }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر إرسال الإحالة");
      return;
    }
    window.location.reload();
  }

  async function close(id: string) {
    setError(null);
    const res = await fetch("/api/referrals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: actions[id] ?? "" }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر إغلاق الإحالة");
      return;
    }
    window.location.reload();
  }

  return (
    <>
      <form className="card" onSubmit={create}>
        <h2>إحالة جديدة</h2>
        <select value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
          <option value="">اختر طالبًا</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName}
            </option>
          ))}
        </select>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} maxLength={500} rows={3} placeholder="سبب الإحالة" />
        <button type="submit">إرسال الإحالة</button>
      </form>

      {error && <p className="error" role="alert">{error}</p>}

      <ul className="list">
        {referrals.map((r) => (
          <li key={r.id} className="card">
            <strong>{r.studentName}</strong> · <span dir="ltr">{r.date}</span>
            <p>{r.reason}</p>
            {r.status === "CLOSED" ? (
              <p>مغلقة: {r.action}</p>
            ) : canHandle ? (
              <div>
                <textarea
                  value={actions[r.id] ?? ""}
                  onChange={(e) => setActions({ ...actions, [r.id]: e.target.value })}
                  rows={2}
                  placeholder="الإجراء المتخذ"
                />
                <button type="button" onClick={() => close(r.id)}>
                  إغلاق الإحالة
                </button>
              </div>
            ) : (
              <p>مفتوحة</p>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
