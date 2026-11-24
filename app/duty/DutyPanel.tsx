"use client";

import { useState } from "react";

type Entry = { id: string; name: string };
type Day = { date: string; label: string; break: Entry[]; duty: Entry[] };
type Teacher = { id: string; fullName: string };

// عرض الأسبوع وتعيين الإشراف والمناوبة لكل يوم، لمن يملك الصلاحية.
export default function DutyPanel({ days, teachers, canEdit, weekStart }: { days: Day[]; teachers: Teacher[]; canEdit: boolean; weekStart: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState<Record<string, string>>({});

  async function assign(date: string, kind: "BREAK" | "DUTY") {
    const key = `${date}-${kind}`;
    const teacherId = pick[key];
    if (!teacherId) return;
    setError(null);
    const res = await fetch("/api/duty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId, date, kind }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر التعيين");
      return;
    }
    window.location.reload();
  }

  async function remove(id: string) {
    setError(null);
    const res = await fetch("/api/duty", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر الحذف");
      return;
    }
    window.location.reload();
  }

  function section(day: Day, kind: "BREAK" | "DUTY", title: string, entries: Entry[]) {
    const key = `${day.date}-${kind}`;
    return (
      <div className="card">
        <h3>{title}</h3>
        {entries.length === 0 ? <p>لا يوجد تعيين.</p> : null}
        <ul className="list">
          {entries.map((e) => (
            <li key={e.id} className="row">
              <span>{e.name}</span>
              {canEdit && <button type="button" onClick={() => remove(e.id)}>حذف</button>}
            </li>
          ))}
        </ul>
        {canEdit && (
          <div>
            <select value={pick[key] ?? ""} onChange={(ev) => setPick({ ...pick, [key]: ev.target.value })}>
              <option value="">اختر معلمًا</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => assign(day.date, kind)}>
              إضافة
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <p dir="ltr">الأسبوع يبدأ: {weekStart}</p>
      {error && <p className="error" role="alert">{error}</p>}
      {days.map((d) => (
        <section key={d.date} className="card">
          <h2>
            {d.label} <span dir="ltr">{d.date}</span>
          </h2>
          {section(d, "BREAK", "الإشراف على الفسحة", d.break)}
          {section(d, "DUTY", "المناوبة", d.duty)}
        </section>
      ))}
    </>
  );
}
