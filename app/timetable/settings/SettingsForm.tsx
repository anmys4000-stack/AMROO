"use client";

import { useState } from "react";
import type { TimetableSettings } from "../../../src/lib/timetable-settings";

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const STAGES = ["ابتدائي", "متوسط"];

export default function SettingsForm({ initial, classes }: { initial: TimetableSettings; classes: string[] }) {
  const [s, setS] = useState<TimetableSettings>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setMsg(null);
    setErr(null);
    const res = await fetch("/api/timetable/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setErr(data.error ?? "تعذّر الحفظ");
    setMsg("تم حفظ الإعدادات.");
  }

  return (
    <>
      <section className="card">
        <h2>أيام العمل</h2>
        {DAYS.map((d, i) => (
          <label key={d} style={{ marginInlineEnd: 12 }}>
            <input type="checkbox" checked={s.workdays.includes(i)} onChange={(e) => setS({ ...s, workdays: e.target.checked ? [...s.workdays, i].sort() : s.workdays.filter((x) => x !== i) })} /> {d}
          </label>
        ))}
      </section>

      <section className="card">
        <h2>الحصص والوقت</h2>
        <label>عدد الحصص الافتراضي <input type="number" min={1} max={10} value={s.defaultPeriods} onChange={(e) => setS({ ...s, defaultPeriods: Number(e.target.value) })} /></label>{" "}
        <label>مدة الحصة (دقيقة) <input type="number" min={15} max={90} value={s.periodMinutes} onChange={(e) => setS({ ...s, periodMinutes: Number(e.target.value) })} /></label>{" "}
        <label>وقت بداية أول حصة <input type="time" dir="ltr" value={s.firstStart} onChange={(e) => setS({ ...s, firstStart: e.target.value })} /></label>{" "}
        <label>الراحة بين الحصص (دقيقة) <input type="number" min={0} max={30} value={s.breakMinutes} onChange={(e) => setS({ ...s, breakMinutes: Number(e.target.value) })} /></label>
      </section>

      <section className="card">
        <h2>عدد الحصص الفعلي لكل مرحلة ويوم (اتركه فارغًا للافتراضي)</h2>
        <table className="table">
          <thead><tr><th>المرحلة</th>{DAYS.map((d) => <th key={d}>{d}</th>)}</tr></thead>
          <tbody>
            {STAGES.map((st) => (
              <tr key={st}>
                <td>{st}</td>
                {DAYS.map((_, i) => (
                  <td key={i}>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      style={{ width: 56 }}
                      value={s.stageDayPeriods[st]?.[i] ?? ""}
                      onChange={(e) => {
                        const v = e.target.value === "" ? undefined : Number(e.target.value);
                        const row = { ...(s.stageDayPeriods[st] ?? {}) };
                        if (v === undefined) delete row[i]; else row[i] = v;
                        setS({ ...s, stageDayPeriods: { ...s.stageDayPeriods, [st]: row } });
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>الفسح</h2>
        <fieldset>
          <legend>{s.recess1.name}</legend>
          بعد الحصة <input type="number" min={1} max={10} value={s.recess1.afterPeriod} onChange={(e) => setS({ ...s, recess1: { ...s.recess1, afterPeriod: Number(e.target.value) } })} />{" "}
          المدة (دقيقة) <input type="number" min={0} max={90} value={s.recess1.minutes} onChange={(e) => setS({ ...s, recess1: { ...s.recess1, minutes: Number(e.target.value) } })} />
        </fieldset>
        <label><input type="checkbox" checked={s.recess2Enabled} onChange={(e) => setS({ ...s, recess2Enabled: e.target.checked })} /> تفعيل فسحة ثانية لبعض الفصول</label>
        {s.recess2Enabled && (
          <>
            <fieldset>
              <legend>{s.recess2.name}</legend>
              بعد الحصة <input type="number" min={1} max={10} value={s.recess2.afterPeriod} onChange={(e) => setS({ ...s, recess2: { ...s.recess2, afterPeriod: Number(e.target.value) } })} />{" "}
              المدة (دقيقة) <input type="number" min={0} max={90} value={s.recess2.minutes} onChange={(e) => setS({ ...s, recess2: { ...s.recess2, minutes: Number(e.target.value) } })} />
            </fieldset>
            <p>توزيع الفصول على الفسحتين:</p>
            <div>
              {classes.map((c) => (
                <label key={c} style={{ display: "inline-block", minWidth: 220, marginBottom: 6 }}>
                  {c}{" "}
                  <select value={s.classRecess[c] ?? 1} onChange={(e) => setS({ ...s, classRecess: { ...s.classRecess, [c]: Number(e.target.value) as 1 | 2 } })}>
                    <option value={1}>{s.recess1.name}</option>
                    <option value={2}>{s.recess2.name}</option>
                  </select>
                </label>
              ))}
            </div>
          </>
        )}
      </section>

      {err && <p className="error" role="alert">{err}</p>}
      {msg && <p role="status">{msg}</p>}
      <button type="button" onClick={save}>حفظ الإعدادات</button>{" "}
      <a href="/timetable">الانتقال لبناء الجدول</a>
    </>
  );
}
