"use client";

import { FormEvent, useState } from "react";

type Activity = { id: string; kind: string; title: string; date: string; approved: boolean };

// إضافة نشاط جديد، واعتماد الأنشطة غير المعتمدة لمن يملك الصلاحية.
export default function ActivitiesPanel({ activities, canEdit }: { activities: Activity[]; canEdit: boolean }) {
  const [kind, setKind] = useState("CLASS");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, title, date }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر الحفظ");
      return;
    }
    window.location.reload();
  }

  async function approve(id: string) {
    setError(null);
    const res = await fetch("/api/activities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      setError("تعذّر الاعتماد");
      return;
    }
    window.location.reload();
  }

  return (
    <>
      {canEdit && (
        <form className="card" onSubmit={add}>
          <h2>نشاط جديد</h2>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="CLASS">صفي</option>
            <option value="NON_CLASS">غير صفي</option>
            <option value="BROADCAST">إذاعة</option>
            <option value="VISIT">زيارة</option>
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={120} placeholder="اسم النشاط" />
          <input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} required />
          <button type="submit">إضافة</button>
        </form>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      {activities.length === 0 ? (
        <p>لا توجد أنشطة بعد.</p>
      ) : (
        <ul className="list">
          {activities.map((a) => (
            <li key={a.id} className="card row">
              <span>
                <span dir="ltr">{a.date}</span> · {a.kind} · {a.title}
              </span>
              <span>
                {a.approved ? "معتمد" : "بانتظار الاعتماد"}
                {canEdit && !a.approved && <button type="button" onClick={() => approve(a.id)}>اعتماد</button>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
