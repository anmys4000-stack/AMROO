"use client";

import { useState } from "react";

type Proposal = {
  classId: string;
  className: string;
  period: number;
  subject: string;
  absentName: string;
  substituteId: string | null;
  substituteName: string | null;
};

// عرض التوزيع المقترح وحفظه. الحصة التي لا يتوفر لها معلم تبقى بدون تكليف.
export default function SubstitutesPanel({ date, proposals }: { date: string; proposals: Proposal[] }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    setNotice(null);
    const res = await fetch("/api/substitutes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        rows: proposals
          .filter((p) => p.substituteId)
          .map((p) => ({ classId: p.classId, period: p.period, subject: p.subject, absentName: p.absentName, substituteId: p.substituteId })),
      }),
    });
    setSaving(false);
    const data = (await res.json().catch(() => null)) as { error?: string; saved?: number } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر الحفظ");
      return;
    }
    setNotice(`تم حفظ ${data?.saved ?? 0} تكليف`);
  }

  return (
    <>
      <ul className="list">
        {proposals.map((p) => (
          <li key={`${p.classId}-${p.period}`} className="card row">
            <span>
              الحصة {p.period} · {p.className} · {p.subject} (بدلًا من {p.absentName})
            </span>
            <span>{p.substituteName ?? "لا يوجد معلم متاح"}</span>
          </li>
        ))}
      </ul>
      {proposals.some((p) => p.substituteId) && (
        <button type="button" onClick={save} disabled={saving}>
          حفظ التوزيع
        </button>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
    </>
  );
}
