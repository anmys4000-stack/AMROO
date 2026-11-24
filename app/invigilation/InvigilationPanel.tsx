"use client";

import { FormEvent, useState } from "react";

type Row = { id: string; room: string; teacher: string };
type Teacher = { id: string; fullName: string };

// تعيين ملاحظ لقاعة، وحذف التعيينات القائمة، لمن يملك الصلاحية.
export default function InvigilationPanel({ date, period, rows, teachers, canEdit }: { date: string; period: number; rows: Row[]; teachers: Teacher[]; canEdit: boolean }) {
  const [room, setRoom] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const res = await fetch("/api/invigilation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, period, room, teacherId }),
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
    const res = await fetch("/api/invigilation", {
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
        <form className="card" onSubmit={assign}>
          <h2>تعيين ملاحظ</h2>
          <input value={room} onChange={(e) => setRoom(e.target.value)} required maxLength={40} placeholder="اسم القاعة" />
          <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} required>
            <option value="">اختر معلمًا</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName}
              </option>
            ))}
          </select>
          <button type="submit">تعيين</button>
        </form>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      <ul className="list">
        {rows.length === 0 ? (
          <li className="card">لا توجد تعيينات لهذه الحصة. ({date} · الحصة {period})</li>
        ) : (
          rows.map((r) => (
            <li key={r.id} className="card row">
              <span>
                {r.room}: {r.teacher}
              </span>
              {canEdit && <button type="button" onClick={() => remove(r.id)}>حذف</button>}
            </li>
          ))
        )}
      </ul>
    </>
  );
}
