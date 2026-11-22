"use client";

import { FormEvent, useEffect, useState } from "react";

type Student = { id: string; fullName: string; classId: string | null };
type Status = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

const STATUS_LABELS: Record<Status, string> = {
  PRESENT: "حاضر",
  ABSENT: "غائب",
  LATE: "متأخر",
  EXCUSED: "بعذر",
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(today());

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/students", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as { students?: Student[]; error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "تعذّر تحميل الطلاب");
        return;
      }
      setStudents(data?.students ?? []);
      setError(null);
    } catch {
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: name }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر إضافة الطالب");
      return;
    }
    setName("");
    setNotice("تمت إضافة الطالب");
    load();
  }

  async function mark(studentId: string, status: Status) {
    setError(null);
    setNotice(null);
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, date, status }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر تسجيل الحضور");
      return;
    }
    setNotice(`تم تسجيل الحضور: ${STATUS_LABELS[status]}`);
  }

  return (
    <main className="page">
      <h1>الطلاب والمواظبة</h1>

      <form className="card" onSubmit={addStudent}>
        <label htmlFor="name">إضافة طالب</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} maxLength={120} />
        <button type="submit">إضافة</button>
      </form>

      <section className="card">
        <label htmlFor="date">تاريخ الغياب</label>
        <input id="date" type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} />
      </section>

      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}

      {loading ? (
        <p>جارٍ التحميل...</p>
      ) : students.length === 0 ? (
        <p>لا يوجد طلاب بعد.</p>
      ) : (
        <ul className="list">
          {students.map((s) => (
            <li key={s.id} className="card row">
              <span>{s.fullName}</span>
              <div className="actions">
                {(Object.keys(STATUS_LABELS) as Status[]).map((st) => (
                  <button key={st} type="button" onClick={() => mark(s.id, st)}>
                    {STATUS_LABELS[st]}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
