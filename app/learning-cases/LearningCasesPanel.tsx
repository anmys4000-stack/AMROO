"use client";

import { FormEvent, useState } from "react";

type Student = { id: string; fullName: string };
type Case = { id: string; studentName: string; kind: string; description: string; open: boolean; date: string };

// فتح حالة جديدة، وقائمة الحالات مع إغلاق المفتوحة لمن يملك الصلاحية.
export default function LearningCasesPanel({ cases, students, canEdit }: { cases: Case[]; students: Student[]; canEdit: boolean }) {
  const [studentId, setStudentId] = useState("");
  const [kind, setKind] = useState("LEARNING");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function open(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const res = await fetch("/api/learning-cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, kind, description }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر الحفظ");
      return;
    }
    window.location.reload();
  }

  async function close(id: string) {
    setError(null);
    const res = await fetch("/api/learning-cases", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      setError("تعذّر الإغلاق");
      return;
    }
    window.location.reload();
  }

  return (
    <>
      {canEdit && (
        <form className="card" onSubmit={open}>
          <h2>حالة جديدة</h2>
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
            <option value="">اختر طالبًا</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </select>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="LEARNING">صعوبات تعلم</option>
            <option value="SPEECH">صعوبات نطق</option>
          </select>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required minLength={3} maxLength={500} rows={3} placeholder="وصف الصعوبة" />
          <button type="submit">فتح الحالة</button>
        </form>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      <ul className="list">
        {cases.map((c) => (
          <li key={c.id} className="card">
            <strong>{c.studentName}</strong> · {c.kind} · <span dir="ltr">{c.date}</span>
            <p>{c.description}</p>
            <p>{c.open ? "مفتوحة" : "مغلقة"}</p>
            {canEdit && c.open && <button type="button" onClick={() => close(c.id)}>إغلاق الحالة</button>}
          </li>
        ))}
      </ul>
    </>
  );
}
