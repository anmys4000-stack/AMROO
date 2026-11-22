"use client";

import { FormEvent, useState } from "react";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirm) {
      setError("كلمتا المرور الجديدتان غير متطابقتين");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        window.location.assign("/");
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "تعذّر تغيير كلمة المرور");
    } catch {
      setError("تعذّر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="login">
      <form className="card" onSubmit={onSubmit} noValidate>
        <h1>تغيير كلمة المرور</h1>
        <p className="sub">يجب تغيير كلمة المرور المؤقتة قبل المتابعة.</p>

        <label htmlFor="current">كلمة المرور الحالية</label>
        <input id="current" type="password" autoComplete="current-password" dir="ltr" required
          value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />

        <label htmlFor="new">كلمة المرور الجديدة (12 حرفًا على الأقل)</label>
        <input id="new" type="password" autoComplete="new-password" dir="ltr" required
          value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />

        <label htmlFor="confirm">تأكيد كلمة المرور الجديدة</label>
        <input id="confirm" type="password" autoComplete="new-password" dir="ltr" required
          value={confirm} onChange={(e) => setConfirm(e.target.value)} />

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" disabled={pending}>
          {pending ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
        </button>
      </form>
    </main>
  );
}
