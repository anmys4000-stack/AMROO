"use client";

import { useState } from "react";

// زر إعادة تعيين كلمة المرور للمدير. تُعرض كلمة المرور المؤقتة مرة واحدة فقط.
export default function ResetButton({ userId }: { userId: string }) {
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reset() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as { temporaryPassword?: string; error?: string } | null;
      if (!res.ok || !data?.temporaryPassword) {
        setError(data?.error ?? "تعذّر إعادة التعيين");
        return;
      }
      setPassword(data.temporaryPassword);
    } catch {
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setBusy(false);
    }
  }

  if (password) {
    return (
      <span>
        كلمة المرور المؤقتة: <code dir="ltr">{password}</code> (تظهر مرة واحدة)
      </span>
    );
  }

  return (
    <span>
      <button type="button" onClick={reset} disabled={busy}>
        إعادة تعيين كلمة المرور
      </button>
      {error && <span className="error"> {error}</span>}
    </span>
  );
}
