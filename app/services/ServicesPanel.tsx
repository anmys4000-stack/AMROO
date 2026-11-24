"use client";

import { useState } from "react";

type Props = {
  todayIso: string;
  canPoints: boolean;
  canStaff: boolean;
  canDuty: boolean;
  canActivity: boolean;
  students: { id: string; label: string }[];
  teachers: { id: string; name: string }[];
  points: { id: string; student: string; points: number; reason: string; date: string }[];
  staff: { id: string; teacher: string; kind: string; minutes: number; date: string }[];
  dutyNotes: string;
  activities: { id: string; title: string; body: string; evidence: string; date: string }[];
};

const KIND_LABEL: Record<string, string> = { LATE: "تأخر", EARLY_LEAVE: "انصراف مبكر", ABSENT: "غياب" };

// نماذج الخدمات. كل نموذج يرسل إلى /api/service بحقل service يحدد نوع الخدمة.
export default function ServicesPanel(p: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(payload: Record<string, unknown>, form: HTMLFormElement) {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch("/api/service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "تعذّر الحفظ");
        return;
      }
      setMessage("تم الحفظ. حدّث الصفحة لرؤية السجل المحدّث.");
      form.reset();
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>, build: (fd: FormData) => Record<string, unknown>) {
    e.preventDefault();
    const form = e.currentTarget;
    send(build(new FormData(form)), form);
  }

  return (
    <>
      {error && <p className="error" role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      {p.canPoints && (
        <section className="card">
          <h2>منح نقاط تحفيزية</h2>
          <form onSubmit={(e) => onSubmit(e, (fd) => ({ service: "points", studentId: fd.get("studentId"), points: Number(fd.get("points")), reason: fd.get("reason") }))}>
            <select name="studentId" required>
              <option value="">اختر الطالب</option>
              {p.students.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <input name="points" type="number" min={1} max={100} defaultValue={5} required />
            <input name="reason" placeholder="سبب المنح" minLength={3} maxLength={300} required />
            <button type="submit" disabled={busy}>حفظ</button>
          </form>
          <ul className="list">
            {p.points.map((r) => (
              <li key={r.id} className="row">
                <span>{r.student} · {r.reason}</span>
                <span>+{r.points} · {r.date}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.canStaff && (
        <section className="card">
          <h2>حضور الكادر (تأخر / انصراف / غياب)</h2>
          <form onSubmit={(e) => onSubmit(e, (fd) => ({ service: "staff-attendance", teacherId: fd.get("teacherId"), date: fd.get("date"), kind: fd.get("kind"), minutes: Number(fd.get("minutes") || 0), note: fd.get("note") }))}>
            <select name="teacherId" required>
              <option value="">اختر المعلم</option>
              {p.teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <input name="date" type="date" dir="ltr" defaultValue={p.todayIso} required />
            <select name="kind" required>
              <option value="LATE">تأخر</option>
              <option value="EARLY_LEAVE">انصراف مبكر</option>
              <option value="ABSENT">غياب</option>
            </select>
            <input name="minutes" type="number" min={0} max={600} defaultValue={0} />
            <input name="note" placeholder="ملاحظة (اختياري)" maxLength={300} />
            <button type="submit" disabled={busy}>حفظ</button>
          </form>
          <ul className="list">
            {p.staff.map((s) => (
              <li key={s.id} className="row">
                <span>{s.teacher} · {KIND_LABEL[s.kind] ?? s.kind}{s.minutes ? ` · ${s.minutes} دقيقة` : ""}</span>
                <span dir="ltr">{s.date}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.canDuty && (
        <section className="card">
          <h2>تقرير المناوبة اليومي</h2>
          <form key={p.todayIso} onSubmit={(e) => onSubmit(e, (fd) => ({ service: "duty-report", date: p.todayIso, notes: fd.get("notes") }))}>
            <textarea name="notes" rows={4} minLength={3} maxLength={2000} defaultValue={p.dutyNotes} required placeholder="ملاحظات المناوبة اليوم" />
            <button type="submit" disabled={busy}>حفظ تقرير اليوم</button>
          </form>
        </section>
      )}

      {p.canActivity && (
        <section className="card">
          <h2>تقرير نشاط</h2>
          <form onSubmit={(e) => onSubmit(e, (fd) => ({ service: "activity-report", title: fd.get("title"), body: fd.get("body"), evidence: fd.get("evidence") }))}>
            <input name="title" placeholder="عنوان النشاط" minLength={3} maxLength={120} required />
            <textarea name="body" rows={4} minLength={3} maxLength={4000} placeholder="وصف النشاط والنتائج" required />
            <input name="evidence" placeholder="مرجع الأدلة (اختياري)" maxLength={500} />
            <button type="submit" disabled={busy}>حفظ التقرير</button>
          </form>
          <ul className="list">
            {p.activities.map((a) => (
              <li key={a.id} className="card">
                <strong>{a.title}</strong> · <span dir="ltr">{a.date}</span>
                <p>{a.body}</p>
                {a.evidence && <small>الأدلة: {a.evidence}</small>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
