"use client";

import { FormEvent, useState } from "react";

type Member = { name: string; role: string };
type Committee = { id: string; name: string; members: Member[] };
type Teacher = { id: string; fullName: string };

// إنشاء لجنة، وإضافة أعضائها، وطباعة قائمة اللجان.
export default function CommitteesPanel({ committees, teachers, canEdit }: { committees: Committee[]; teachers: Teacher[]; canEdit: boolean }) {
  const [name, setName] = useState("");
  const [committeeId, setCommitteeId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [role, setRole] = useState("عضو");
  const [error, setError] = useState<string | null>(null);

  async function createCommittee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const res = await fetch("/api/committees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر الحفظ");
      return;
    }
    window.location.reload();
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const res = await fetch("/api/committees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ committeeId, teacherId, role }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر إضافة العضو");
      return;
    }
    window.location.reload();
  }

  return (
    <>
      {canEdit && (
        <div className="card">
          <form onSubmit={createCommittee}>
            <h2>لجنة جديدة</h2>
            <input value={name} onChange={(e) => setName(e.target.value)} required minLength={3} maxLength={80} placeholder="اسم اللجنة" />
            <button type="submit">إنشاء</button>
          </form>
          <form onSubmit={addMember}>
            <h2>إضافة عضو</h2>
            <select value={committeeId} onChange={(e) => setCommitteeId(e.target.value)} required>
              <option value="">اختر اللجنة</option>
              {committees.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} required>
              <option value="">اختر المعلم</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="رئيس">رئيس</option>
              <option value="عضو">عضو</option>
              <option value="مراقب">مراقب</option>
            </select>
            <button type="submit">إضافة</button>
          </form>
        </div>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      {committees.map((c) => (
        <section key={c.id} className="card">
          <h2>{c.name}</h2>
          {c.members.length === 0 ? (
            <p>لا يوجد أعضاء بعد.</p>
          ) : (
            <ul className="list">
              {c.members.map((m, i) => (
                <li key={i} className="row">
                  <span>{m.name}</span>
                  <span>{m.role}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <button type="button" onClick={() => window.print()}>
        طباعة
      </button>
    </>
  );
}
