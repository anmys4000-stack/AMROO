"use client";

import { FormEvent, useState } from "react";

type Slot = { id: string; date: string; period: number; subject: string; className: string };
type Cls = { id: string; name: string };

// إضافة حصة اختبار وحذفها، وعرض الجدول مرتبًا حسب اليوم والحصة.
export default function ExamsPanel({ slots, classes, canEdit }: { slots: Slot[]; classes: Cls[]; canEdit: boolean }) {
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [period, setPeriod] = useState("1");
  const [subject, setSubject] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const res = await fetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, date, period: Number(period), subject }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر الحفظ");
      return;
    }
    window.location.reload();
  }

  async function remove(id: string) {
    setError(null);
    const res = await fetch("/api/exams", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      setError("تعذّر الحذف");
      return;
    }
    window.location.reload();
  }

  return (
    <>
      {canEdit && (
        <form className="card" onSubmit={add}>
          <h2>إضافة اختبار</h2>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} required>
            <option value="">اختر الفصل</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} required />
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
              <option key={p} value={p}>
                الحصة {p}
              </option>
            ))}
          </select>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} required minLength={2} maxLength={60} placeholder="المادة" />
          <button type="submit">إضافة</button>
        </form>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      {slots.length === 0 ? (
        <p>لا توجد اختبارات مجدولة بعد.</p>
      ) : (
        <ul className="list">
          {slots.map((s) => (
            <li key={s.id} className="card row">
              <span>
                <span dir="ltr">{s.date}</span> · الحصة {s.period} · {s.className} · {s.subject}
              </span>
              {canEdit && <button type="button" onClick={() => remove(s.id)}>حذف</button>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
