"use client";

import { FormEvent, useState } from "react";

type Student = { id: string; fullName: string };

// إرسال رسالة إلى ولي أمر طالب محدد.
export default function MessageForm({ students }: { students: Student[] }) {
  const [studentId, setStudentId] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, text }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر إرسال الرسالة");
      return;
    }
    setText("");
    setNotice("تم إرسال الرسالة");
    window.location.reload();
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>رسالة إلى ولي أمر</h2>
      <label htmlFor="student">الطالب</label>
      <select id="student" value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
        <option value="">اختر طالبًا</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.fullName}
          </option>
        ))}
      </select>
      <label htmlFor="text">نص الرسالة</label>
      <textarea id="text" value={text} onChange={(e) => setText(e.target.value)} required minLength={2} maxLength={1000} rows={3} />
      <button type="submit">إرسال</button>
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
    </form>
  );
}
