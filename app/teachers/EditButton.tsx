"use client";

import { FormEvent, useState } from "react";

// تعديل اسم المعلم وتخصصه للمدير فقط.
export default function EditButton({ userId, fullName, specialty }: { userId: string; fullName: string; specialty: string }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(fullName);
  const [spec, setSpec] = useState(specialty);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: name, specialty: spec }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر الحفظ");
      return;
    }
    setSaved(true);
    setEditing(false);
  }

  if (!editing) {
    return (
      <span>
        <button type="button" onClick={() => setEditing(true)}>
          تعديل
        </button>
        {saved && <span> تم الحفظ، حدّث الصفحة لرؤية التغيير</span>}
      </span>
    );
  }

  return (
    <form onSubmit={save}>
      <input value={name} onChange={(e) => setName(e.target.value)} required minLength={3} maxLength={120} />
      <input value={spec} onChange={(e) => setSpec(e.target.value)} maxLength={60} placeholder="التخصص" />
      <button type="submit">حفظ</button>
      <button type="button" onClick={() => setEditing(false)}>
        إلغاء
      </button>
      {error && <span className="error"> {error}</span>}
    </form>
  );
}
