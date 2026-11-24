"use client";

import { useState } from "react";

type Row = { classId: string; className: string; subject: string; teacher: string; checked: boolean; checkedByMe: boolean; canRecord: boolean };

// زر تسجيل تحضير الحصة لمن يملك الحق فيها (معلمها أو المخوّل).
export default function PeriodPanel({ rows, date, period }: { rows: Row[]; date: string; period: number }) {
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<Record<string, boolean>>({});

  async function record(classId: string) {
    setError(null);
    const res = await fetch("/api/period-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, date, period }),
    });
    if (!res.ok) {
      setError("تعذّر التسجيل");
      return;
    }
    setState({ ...state, [classId]: true });
  }

  return (
    <>
      {error && <p className="error" role="alert">{error}</p>}
      <ul className="list">
        {rows.map((r) => {
          const checked = r.checked || state[r.classId];
          return (
            <li key={r.classId} className="card row">
              <span>
                {r.className} · {r.subject} {r.teacher ? `· ${r.teacher}` : ""}
              </span>
              <span>
                {checked ? "تم التحضير" : "لم يُحضَّر"}
                {!checked && r.canRecord && <button type="button" onClick={() => record(r.classId)}>تسجيل التحضير</button>}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
