"use client";

import { useState } from "react";

type Teacher = { id: string; fullName: string };
type Cls = { id: string; name: string; leaderId: string };

// لكل فصل قائمة بالمعلمين لاختيار الرائد، ويُحفظ عند التغيير.
export default function HomeroomPanel({ classes, teachers, canEdit }: { classes: Cls[]; teachers: Teacher[]; canEdit: boolean }) {
  const [leaders, setLeaders] = useState<Record<string, string>>(Object.fromEntries(classes.map((c) => [c.id, c.leaderId])));
  const [error, setError] = useState<string | null>(null);
  const names = new Map(teachers.map((t) => [t.id, t.fullName]));

  async function change(classId: string, teacherId: string) {
    setError(null);
    const res = await fetch("/api/homeroom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, teacherId }),
    });
    if (!res.ok) {
      setError("تعذّر الحفظ");
      return;
    }
    setLeaders({ ...leaders, [classId]: teacherId });
  }

  return (
    <>
      {error && <p className="error" role="alert">{error}</p>}
      <ul className="list">
        {classes.map((c) => (
          <li key={c.id} className="card row">
            <span>{c.name}</span>
            {canEdit ? (
              <select value={leaders[c.id] ?? ""} onChange={(e) => change(c.id, e.target.value)}>
                <option value="">بدون رائد</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName}
                  </option>
                ))}
              </select>
            ) : (
              <span>{names.get(leaders[c.id] ?? "") ?? "بدون رائد"}</span>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
