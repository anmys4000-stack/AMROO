"use client";

import { FormEvent, useEffect, useState } from "react";

type Student = { id: string; fullName: string };
type Record = { id: string; category: string; description: string; createdAt: string };

const CATEGORIES = ["مخالفة", "سلوك إيجابي", "إجراء تربوي"];

export default function BehaviorPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [records, setRecords] = useState<Record[]>([]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/students", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { students?: Student[] }) => setStudents(d.students ?? []))
      .catch(() => setError("تعذّر تحميل الطلاب"));
  }, []);

  async function loadRecords(id: string) {
    setError(null);
    if (!id) {
      setRecords([]);
      return;
    }
    const res = await fetch(`/api/behavior?studentId=${encodeURIComponent(id)}`, { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { records?: Record[]; error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر تحميل السجل");
      return;
    }
    setRecords(data?.records ?? []);
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const res = await fetch("/api/behavior", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, category, description }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر حفظ السجل");
      return;
    }
    setDescription("");
    setNotice("تم تسجيل الحدث");
    loadRecords(studentId);
  }

  return (
    <main className="page">
      <h1>السلوك والمواظبة</h1>

      <section className="card">
        <label htmlFor="st">الطالب</label>
        <select
          id="st"
          value={studentId}
          onChange={(e) => {
            setStudentId(e.target.value);
            loadRecords(e.target.value);
          }}
        >
          <option value="">اختر طالبًا</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName}
            </option>
          ))}
        </select>
      </section>

      {studentId && (
        <form className="card" onSubmit={add}>
          <label htmlFor="cat">التصنيف</label>
          <select id="cat" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <label htmlFor="desc">الوصف</label>
          <input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} required minLength={3} maxLength={1000} />
          <button type="submit">تسجيل</button>
        </form>
      )}

      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}

      {studentId && (
        <ul className="list">
          {records.length === 0 ? (
            <li>لا توجد سجلات لهذا الطالب.</li>
          ) : (
            records.map((r) => (
              <li key={r.id} className="card">
                <strong>{r.category}</strong> — {r.description}
                <div className="muted">{new Date(r.createdAt).toLocaleDateString("ar-SA")}</div>
              </li>
            ))
          )}
        </ul>
      )}
    </main>
  );
}
