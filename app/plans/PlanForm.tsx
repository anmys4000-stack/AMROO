"use client";

import { FormEvent, useState } from "react";

// نموذج الخطة الأسبوعية للمعلم، ويُحدَّث إن وُجدت خطة لذلك الأسبوع.
const TYPE_LABEL: Record<string, string> = { CLASS: "حصة صفية", NON_CLASS: "غير صفية", ACTIVITY: "أنشطة" };

export default function PlanForm({ weekStart, initial, initialType }: { weekStart: string; initial: string; initialType: string }) {
  const [content, setContent] = useState(initial);
  const [planType, setPlanType] = useState(initialType);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart, content, planType }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر الحفظ");
      return;
    }
    setNotice("تم حفظ الخطة");
  }

  return (
    <form className="card" onSubmit={save}>
      <select value={planType} onChange={(e) => setPlanType(e.target.value)}>
        {Object.entries(TYPE_LABEL).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <textarea value={content} onChange={(e) => setContent(e.target.value)} required minLength={5} maxLength={4000} rows={10} placeholder="الخطة الأسبوعية" />
      <button type="submit">حفظ الخطة</button>
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
    </form>
  );
}
