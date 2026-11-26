"use client";

import { useState } from "react";

type ClassRow = { id: string; name: string; counselorId: string | null };
type Counselor = { id: string; fullName: string };

// توزيع الموجهين على الصفوف، وربط حصص الجدول بحسابات المعلمين بالاسم المطابق.
export default function OperationsPanel({ classes, counselors }: { classes: ClassRow[]; counselors: Counselor[] }) {
  const [assign, setAssign] = useState<Record<string, string>>(
    Object.fromEntries(classes.map((c) => [c.id, c.counselorId ?? ""])),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveCounselors() {
    setError(null);
    setNotice(null);
    const res = await fetch("/api/guidance/assign", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments: assign }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) return setError(data?.error ?? "تعذّر حفظ التوزيع");
    setNotice("تم حفظ توزيع الموجهين.");
  }

  async function linkTeachers() {
    setError(null);
    setNotice(null);
    const res = await fetch("/api/timetable/link-teachers", { method: "POST" });
    const data = (await res.json().catch(() => null)) as { linked?: number; ambiguous?: number; unmatchedNames?: string[]; error?: string } | null;
    if (!res.ok || !data) return setError(data?.error ?? "تعذّر الربط");
    const extra = data.unmatchedNames?.length ? ` لم يُعثر على ${data.unmatchedNames.length} اسمًا: ${data.unmatchedNames.join("، ")}.` : "";
    setNotice(`تم ربط ${data.linked} حصة بالمعلمين.${data.ambiguous ? ` ${data.ambiguous} حصة بأسماء متكررة لم تُربط.` : ""}${extra}`);
  }

  return (
    <>
      <section className="card">
        <h2>توزيع الموجهين الطلابيين على الصفوف</h2>
        <p>موجه كل صف يُحفظ مرة واحدة، فتُحال إليه الحالات مباشرة بعد إجراء وكيل شؤون الطلاب.</p>
        {classes.map((c) => (
          <label key={c.id} style={{ display: "inline-block", minWidth: 240, marginBottom: 6 }}>
            {c.name}{" "}
            <select value={assign[c.id] ?? ""} onChange={(e) => setAssign({ ...assign, [c.id]: e.target.value })}>
              <option value="">بدون موجه</option>
              {counselors.map((k) => (
                <option key={k.id} value={k.id}>{k.fullName}</option>
              ))}
            </select>
          </label>
        ))}
        <div><button type="button" onClick={saveCounselors}>حفظ توزيع الموجهين</button></div>
      </section>

      <section className="card">
        <h2>ربط المعلمين تلقائيًا</h2>
        <p>يربط حصص الجدول التي كُتب فيها اسم المعلم بحساب المعلم الذي يحمل الاسم نفسه في المدرسة.</p>
        <button type="button" onClick={linkTeachers}>ربط الآن</button>
      </section>

      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
    </>
  );
}
