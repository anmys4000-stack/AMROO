"use client";

import { FormEvent, useEffect, useState } from "react";

type Student = { id: string; fullName: string };

// نموذج تقديم عذر غياب لطالب في تاريخ محدد.
export default function ExcuseForm() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/students", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { students?: Student[] }) => setStudents(d.students ?? []))
      .catch(() => setError("تعذّر تحميل الطلاب"));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const res = await fetch("/api/excuses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, date, reason }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر تقديم العذر");
      return;
    }
    setReason("");
    setNotice("تم تقديم العذر وهو بانتظار الاعتماد");
    window.location.reload();
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>تقديم عذر</h2>
      <label htmlFor="student">الطالب</label>
      <select id="student" value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
        <option value="">اختر طالبًا</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.fullName}
          </option>
        ))}
      </select>
      <label htmlFor="date">التاريخ</label>
      <input id="date" type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} required />
      <label htmlFor="reason">سبب العذر</label>
      <input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} maxLength={300} />
      <button type="submit">تقديم</button>
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
    </form>
  );
}
