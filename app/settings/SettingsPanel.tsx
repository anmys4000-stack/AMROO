"use client";

import { FormEvent, useState } from "react";

type U = { id: string; fullName: string; email: string; role: string; roleKey: string; extraRoles: string[]; isActive: boolean };

const EXTRA_ROLE_OPTIONS: [string, string][] = [
  ["PRINCIPAL", "مدير المدرسة"],
  ["STUDENT_AFFAIRS", "وكيل شؤون الطلاب"],
  ["GUIDANCE", "موجه طلابي"],
  ["ACADEMIC_DEPUTY", "وكيل الشؤون التعليمية"],
  ["TEACHER", "معلم"],
];

// اسم المدرسة، وإضافة مستخدم بكلمة مرور مؤقتة، وقائمة المستخدمين.
type Profile = {
  ministryNumber: string; region: string; city: string; stages: string[]; schoolType: string;
  planType: string; academicYear: string; currentTerm: string; compensationPoints: number;
};

export default function SettingsPanel({ schoolName, profile, users, classCount }: { schoolName: string; profile: Profile; users: U[]; classCount: number }) {
  const [name, setName] = useState(schoolName);
  const [p, setP] = useState<Profile>(profile);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
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

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setProfileNotice(null);
    const res = await fetch("/api/school", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, name }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر الحفظ");
      return;
    }
    setProfileNotice("تم حفظ بيانات المدرسة والعام الدراسي");
  }

  function toggleStage(stage: string) {
    setP({ ...p, stages: p.stages.includes(stage) ? p.stages.filter((x) => x !== stage) : [...p.stages, stage] });
  }

  const [credUser, setCredUser] = useState("");
  const [credId, setCredId] = useState("");
  const [credNotice, setCredNotice] = useState<string | null>(null);

  const [extraDraft, setExtraDraft] = useState<Record<string, string[]>>({});
  const [rolesNotice, setRolesNotice] = useState<string | null>(null);

  async function saveExtraRoles(userId: string) {
    setError(null);
    setRolesNotice(null);
    const extraRoles = extraDraft[userId] ?? users.find((u) => u.id === userId)?.extraRoles ?? [];
    const res = await fetch(`/api/users/${userId}/roles`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extraRoles }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر حفظ الأدوار");
      return;
    }
    setRolesNotice("تم حفظ الأدوار الإضافية. يسري التغيير عند الدخول التالي.");
  }

  async function generateCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCredNotice(null);
    setError(null);
    const res = await fetch(`/api/users/${credUser}/credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nationalId: credId }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "تعذّر توليد بيانات الدخول");
      return;
    }
    setCredNotice("تم توليد بيانات الدخول. اسم المستخدم هو رقم الهوية، وسيُطلب تغيير كلمة المرور عند أول دخول.");
    setCredId("");
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

      <form className="card" onSubmit={saveProfile}>
        <h2>بيانات المدرسة والعام الدراسي</h2>
        <label>الرقم الوزاري <input dir="ltr" value={p.ministryNumber} onChange={(e) => setP({ ...p, ministryNumber: e.target.value })} maxLength={20} /></label>
        <label>المنطقة / الإدارة التعليمية <input value={p.region} onChange={(e) => setP({ ...p, region: e.target.value })} maxLength={120} /></label>
        <label>المدينة <input value={p.city} onChange={(e) => setP({ ...p, city: e.target.value })} maxLength={120} /></label>
        <fieldset>
          <legend>المراحل التعليمية (يمكن اختيار أكثر من مرحلة)</legend>
          {["ابتدائي", "متوسط", "ثانوي"].map((st) => (
            <label key={st} style={{ marginInlineEnd: 12 }}>
              <input type="checkbox" checked={p.stages.includes(st)} onChange={() => toggleStage(st)} /> {st}
            </label>
          ))}
        </fieldset>
        <label>نوع المدرسة
          <select value={p.schoolType} onChange={(e) => setP({ ...p, schoolType: e.target.value })}>
            <option value="بنين">بنين</option>
            <option value="بنات">بنات</option>
          </select>
        </label>
        <label>نوع الخطة الدراسية
          <select value={p.planType} onChange={(e) => setP({ ...p, planType: e.target.value })}>
            <option value="عام">عام (تعليم عام)</option>
            <option value="تحفيظ">تحفيظ</option>
          </select>
        </label>
        <label>العام الدراسي <input dir="ltr" value={p.academicYear} onChange={(e) => setP({ ...p, academicYear: e.target.value })} maxLength={20} placeholder="1448هـ" /></label>
        <label>الفصل الدراسي الحالي
          <select value={p.currentTerm} onChange={(e) => setP({ ...p, currentTerm: e.target.value })}>
            <option value="الفصل الأول">الفصل الأول</option>
            <option value="الفصل الثاني">الفصل الثاني</option>
            <option value="الفصل الثالث">الفصل الثالث</option>
          </select>
        </label>
        <label>درجات التعويض (تُمنح مرة كل فصل)
          <input type="number" min={0} max={500} value={p.compensationPoints} onChange={(e) => setP({ ...p, compensationPoints: Number(e.target.value) })} />
        </label>
        <button type="submit">حفظ الإعدادات</button>
        {profileNotice && <p className="notice" role="status">{profileNotice}</p>}
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

      <section className="card">
        <h2>الأدوار الإضافية</h2>
        <p>يحصل المستخدم على صلاحيات دوره الرئيسي وكل دور إضافي يُمنح له.</p>
        {users.filter((u) => u.isActive).map((u) => {
          const current = extraDraft[u.id] ?? u.extraRoles;
          return (
            <div key={u.id} className="row" style={{ flexWrap: "wrap", gap: 8 }}>
              <strong>{u.fullName}</strong>
              <span>{u.role}</span>
              {EXTRA_ROLE_OPTIONS.filter(([key]) => key !== u.roleKey).map(([key, label]) => (
                <label key={key} style={{ marginInlineEnd: 8 }}>
                  <input
                    type="checkbox"
                    checked={current.includes(key)}
                    onChange={(e) => {
                      const next = e.target.checked ? [...current, key] : current.filter((x) => x !== key);
                      setExtraDraft({ ...extraDraft, [u.id]: next });
                    }}
                  />{" "}
                  {label}
                </label>
              ))}
              <button type="button" onClick={() => saveExtraRoles(u.id)}>حفظ</button>
            </div>
          );
        })}
        {rolesNotice && <p className="notice" role="status">{rolesNotice}</p>}
      </section>

      <form className="card" onSubmit={generateCredentials}>
        <h2>توليد بيانات الدخول من رقم الهوية</h2>
        <select value={credUser} onChange={(e) => setCredUser(e.target.value)} required>
          <option value="">اختر المستخدم</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.fullName}</option>
          ))}
        </select>
        <input dir="ltr" inputMode="numeric" pattern="\d{10}" maxLength={10} value={credId} onChange={(e) => setCredId(e.target.value)} placeholder="رقم الهوية (10 أرقام)" required />
        <button type="submit">توليد</button>
        {credNotice && <p className="notice" role="status">{credNotice}</p>}
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
