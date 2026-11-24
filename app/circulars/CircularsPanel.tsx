"use client";

import { FormEvent, useState } from "react";

type Circular = {
  id: string;
  title: string;
  body: string;
  audience: string;
  date: string;
  read: boolean;
  unread: string[];
};

// نشر تعميم جديد، وعرض التعاميم مع زر الاطلاع وكشف الاطلاع لمن يملك الصلاحية.
export default function CircularsPanel({ circulars, canPublish }: { circulars: Circular[]; canPublish: boolean }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("ALL");
  const [error, setError] = useState<string | null>(null);

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const res = await fetch("/api/circulars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, audience }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر النشر");
      return;
    }
    window.location.reload();
  }

  async function markRead(id: string) {
    setError(null);
    const res = await fetch("/api/circulars", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      setError("تعذّر تسجيل الاطلاع");
      return;
    }
    window.location.reload();
  }

  return (
    <>
      {canPublish && (
        <form className="card" onSubmit={publish}>
          <h2>تعميم جديد</h2>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={120} placeholder="عنوان التعميم" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} required minLength={3} maxLength={4000} rows={4} placeholder="نص التعميم" />
          <select value={audience} onChange={(e) => setAudience(e.target.value)}>
            <option value="ALL">للجميع</option>
            <option value="TEACHERS">للمعلمين فقط</option>
          </select>
          <button type="submit">نشر</button>
        </form>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      <ul className="list">
        {circulars.map((c) => (
          <li key={c.id} className="card">
            <h2>{c.title}</h2>
            <p>{c.body}</p>
            <small dir="ltr">{c.date}</small>
            <div>
              {c.read ? (
                <span>تم الاطلاع</span>
              ) : (
                <button type="button" onClick={() => markRead(c.id)}>
                  تم الاطلاع
                </button>
              )}
            </div>
            {canPublish && (
              <details>
                <summary>كشف الاطلاع: لم يطّلع {c.unread.length} معلم</summary>
                <p>{c.unread.length === 0 ? "الجميع اطّلع." : c.unread.join("، ")}</p>
              </details>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
