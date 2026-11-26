"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, fmt, periodTimes, type TimetableSettings } from "../../src/lib/timetable-settings";

type ClassRow = { id: string; name: string };
type Teacher = { id: string; fullName: string };
type Entry = { id: string; weekday: number; period: number; subject: string; teacherId: string | null };

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default function TimetablePage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classId, setClassId] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [settings, setSettings] = useState<TimetableSettings>(DEFAULT_SETTINGS);

  // أيام الجدول وعدد الحصص من إعدادات الجدول. الجدول يدعم الأحد إلى الخميس فقط (أيام 1 إلى 5).
  const days = settings.workdays.filter((d) => d <= 4).map((d) => ({ index: d, weekday: d + 1, name: DAY_NAMES[d] }));
  const stageMax = Math.max(0, ...Object.values(settings.stageDayPeriods).flatMap((row) => Object.values(row ?? {}) as number[]));
  const periodCount = Math.max(settings.defaultPeriods, stageMax, 1);
  const PERIODS = Array.from({ length: periodCount }, (_, i) => i + 1);
  const times = periodTimes(settings, periodCount, settings.recess1);

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
    fetch("/api/timetable/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { settings?: TimetableSettings }) => d.settings && setSettings(d.settings))
      .catch(() => undefined);
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
          {days.map((day) => (
            <section key={day.weekday} className="card">
              <h2>{day.name}</h2>
              {PERIODS.map((p) => {
                const weekday = day.weekday;
                const current = entryFor(weekday, p);
                const t = times[p - 1];
                return (
                  <SlotEditor
                    key={`${weekday}-${p}-${current?.id ?? "new"}`}
                    label={`الحصة ${p}${t ? ` · ${fmt(t.start)} - ${fmt(t.end)}` : ""}`}
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
