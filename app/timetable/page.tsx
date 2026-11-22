"use client";

import { useEffect, useState } from "react";

type ClassRow = { id: string; name: string };
type Teacher = { id: string; fullName: string };
type Entry = { id: string; weekday: number; period: number; subject: string; teacherId: string | null };

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];

export default function TimetablePage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classId, setClassId] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(nextClassId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/timetable?classId=${encodeURIComponent(nextClassId)}`, { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as
        | { classes: ClassRow[]; teachers: Teacher[]; entries: Entry[]; error?: string }
        | null;
      if (!res.ok || !data) {
        setError(data?.error ?? "تعذّر تحميل الجدول");
        return;
      }
      setClasses(data.classes);
      setTeachers(data.teachers);
      setEntries(data.entries);
    } catch {
      setError("تعذّر الاتصال بالخادم");
    }
  }

  useEffect(() => {
    load("");
  }, []);

  function entryFor(weekday: number, period: number): Entry | undefined {
    return entries.find((e) => e.weekday === weekday && e.period === period);
  }

  async function save(weekday: number, period: number, subject: string, teacherId: string) {
    setError(null);
    setNotice(null);
    const res = await fetch("/api/timetable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, weekday, period, subject, teacherId }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر حفظ الحصة");
      return;
    }
    setNotice("تم الحفظ");
    load(classId);
  }

  return (
    <main className="page">
      <h1>الجدول الدراسي</h1>

      <section className="card">
        <label htmlFor="cls">الفصل</label>
        <select
          id="cls"
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            load(e.target.value);
          }}
        >
          <option value="">اختر فصلًا</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </section>

      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}

      {classId && (
        <div className="grid">
          {DAYS.map((day, i) => (
            <section key={day} className="card">
              <h2>{day}</h2>
              {PERIODS.map((p) => {
                const weekday = i + 1;
                const current = entryFor(weekday, p);
                return (
                  <SlotEditor
                    key={`${weekday}-${p}-${current?.id ?? "new"}`}
                    label={`الحصة ${p}`}
                    initialSubject={current?.subject ?? ""}
                    initialTeacherId={current?.teacherId ?? ""}
                    teachers={teachers}
                    onSave={(subject, teacherId) => save(weekday, p, subject, teacherId)}
                  />
                );
              })}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

function SlotEditor(props: {
  label: string;
  initialSubject: string;
  initialTeacherId: string;
  teachers: Teacher[];
  onSave: (subject: string, teacherId: string) => void;
}) {
  const [subject, setSubject] = useState(props.initialSubject);
  const [teacherId, setTeacherId] = useState(props.initialTeacherId);
  return (
    <div className="slot">
      <strong>{props.label}</strong>
      <input placeholder="المادة (اتركها فارغة للحذف)" value={subject} maxLength={60} onChange={(e) => setSubject(e.target.value)} />
      <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
        <option value="">بدون معلم</option>
        {props.teachers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.fullName}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => props.onSave(subject, teacherId)}>حفظ</button>
    </div>
  );
}
