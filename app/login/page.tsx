"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email, password }),
      });
      if (res.ok) {
        window.location.assign("/");
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "تعذّر تسجيل الدخول، حاول مرة أخرى");
    } catch {
      setError("تعذّر الاتصال بالخادم، تحقق من الشبكة وحاول مرة أخرى");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="login">
      <form className="card" onSubmit={onSubmit} noValidate>
        <h1>تسجيل الدخول</h1>
        <p className="sub">منصّة مسار · AMROO</p>

        <label htmlFor="email">البريد الإلكتروني أو رقم الهوية</label>
        <input
          id="email"
          name="email"
          type="text"
          autoComplete="username"
          dir="ltr"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="password">كلمة المرور</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          dir="ltr"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={pending}>
          {pending ? "جارٍ الدخول..." : "دخول"}
        </button>
      </form>
    </main>
  );
}
