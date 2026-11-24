"use client";

import { useState } from "react";

// توليد تعيينات الإشراف والمناوبة لعدة أسابيع انطلاقًا من تاريخ محدد.
export default function GenerateForm({ defaultDate }: { defaultDate: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/duty/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: fd.get("startDate"),
        weeks: Number(fd.get("weeks")),
        breakPeriod: Number(fd.get("breakPeriod")),
        dutyPeriod: Number(fd.get("dutyPeriod")),
        breakCount: Number(fd.get("breakCount")),
        dutyCount: Number(fd.get("dutyCount")),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "تعذّر التوليد");
      return;
    }
    setMessage(`أُضيف ${data.created} تعيين. الأيام التي فيها تعيينات سابقة لم تُعدَّل (${data.skippedDays}).`);
  }

  return (
    <form className="card no-print" onSubmit={generate}>
      <h2>توليد تلقائي للإشراف والمناوبة</h2>
      <label>
        بداية الأسبوع <input name="startDate" type="date" dir="ltr" defaultValue={defaultDate} required />
      </label>
      <label>
        عدد الأسابيع <input name="weeks" type="number" min={1} max={20} defaultValue={1} required />
      </label>
      <label>
        حصة ما بعد الفسحة <input name="breakPeriod" type="number" min={1} max={8} defaultValue={3} required />
      </label>
      <label>
        حصة المناوبة <input name="dutyPeriod" type="number" min={1} max={8} defaultValue={6} required />
      </label>
      <label>
        معلمو الإشراف لكل يوم <input name="breakCount" type="number" min={1} max={10} defaultValue={2} required />
      </label>
      <label>
        معلمو المناوبة لكل يوم <input name="dutyCount" type="number" min={1} max={10} defaultValue={1} required />
      </label>
      <button type="submit">توليد</button>
      {message && <p role="status">{message}</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  );
}
