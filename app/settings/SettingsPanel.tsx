"use client";

import { FormEvent, useState } from "react";

type U = { id: string; fullName: string; email: string; role: string; isActive: boolean };

// اسم المدرسة، وإضافة مستخدم بكلمة مرور مؤقتة، وقائمة المستخدمين.
export default function SettingsPanel({ schoolName, users, classCount }: { schoolName: string; users: U[]; classCount: number }) {
  const [name, setName] = useState(schoolName);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("TEACHER");
  const [created, setCreated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const res = await fetch("/api/school", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر الحفظ");
      return;
    }
    setNotice("تم حفظ اسم المدرسة");
  }

  async function addUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreated(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, role }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string; temporaryPassword?: string } | null;
    if (!res.ok || !data?.temporaryPassword) {
      setError(data?.error ?? "تعذّر إنشاء الحساب");
      return;
    }
    setCreated(`كلمة المرور المؤقتة: ${data.temporaryPassword} (تظهر مرة واحدة)`);
    setFullName("");
    setEmail("");
  }

  return (
    <>
      <form className="card" onSubmit={saveName}>
        <h2>بيانات المدرسة</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} required minLength={3} maxLength={160} />
        <button type="submit">حفظ</button>
        <p>عدد الفصول: {classCount}</p>
        {notice && <p className="notice" role="status">{notice}</p>}
      </form>

      <form className="card" onSubmit={addUser}>
        <h2>إضافة مستخدم</h2>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={3} maxLength={120} placeholder="الاسم الكامل" />
        <input dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={120} placeholder="البريد الإلكتروني" />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="TEACHER">معلم</option>
          <option value="ACADEMIC_DEPUTY">وكيل الشؤون التعليمية</option>
          <option value="STUDENT_AFFAIRS">وكيل شؤون الطلاب</option>
          <option value="GUIDANCE">الموجه الطلابي</option>
          <option value="PRINCIPAL">مدير المدرسة</option>
        </select>
        <button type="submit">إنشاء الحساب</button>
        {created && <p className="notice" role="status" dir="ltr">{created}</p>}
      </form>

      {error && <p className="error" role="alert">{error}</p>}

      <section className="card">
        <h2>المستخدمون ({users.length})</h2>
        <ul className="list">
          {users.map((u) => (
            <li key={u.id} className="row">
              <span>{u.fullName}</span>
              <span dir="ltr">{u.email}</span>
              <span>{u.role}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
