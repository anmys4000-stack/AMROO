"use client";

import { useState } from "react";

const LABELS: Record<string, string> = {
  PRINCIPAL: "مدير المدرسة",
  STUDENT_AFFAIRS: "وكيل شؤون الطلاب",
  ACADEMIC_DEPUTY: "وكيل الشؤون التعليمية",
  GUIDANCE: "الموجّه الطلابي",
  TEACHER: "معلم",
  GUARDIAN: "ولي أمر",
  ACTIVITY_LEADER: "رائد النشاط",
};

// قائمة تبديل الدور: تظهر فقط إذا كان للمستخدم أكثر من دور.
export default function RoleSwitcher({ roles, active }: { roles: string[]; active: string }) {
  const [busy, setBusy] = useState(false);
  if (roles.length < 2) return null;

  async function change(value: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/view-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: value }),
      });
      if (res.ok) window.location.href = "/";
      else setBusy(false);
    } catch {
      setBusy(false);
    }
  }

  return (
    <label className="role-switch">
      <span>تغيير الدور</span>
      <select value={active} disabled={busy} onChange={(e) => change(e.target.value)}>
        {roles.map((r) => (
          <option key={r} value={r}>{LABELS[r] ?? r}</option>
        ))}
      </select>
    </label>
  );
}
