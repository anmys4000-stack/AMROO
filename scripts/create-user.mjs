// إنشاء مدرسة ومستخدم مدير تجريبي. تُشغَّل يدويًا من جهازك أو من Shell الخاص بالخدمة.
// لا تُكتب كلمة المرور في الملف ولا في المحادثة؛ تُمرَّر كمتغير بيئة عند التشغيل فقط.
//
//   DATABASE_URL="..." TEST_EMAIL="you@example.com" TEST_PASSWORD="..." node scripts/create-user.mjs
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";

const scrypt = promisify(scryptCb);
const prisma = new PrismaClient();

const email = (process.env.TEST_EMAIL ?? "").trim().toLowerCase();
const password = process.env.TEST_PASSWORD ?? "";

if (!email.includes("@") || password.length < 12) {
  console.error("TEST_EMAIL must be an email and TEST_PASSWORD at least 12 characters.");
  process.exit(1);
}

// نفس صيغة src/lib/password.ts حتى يقبلها تسجيل الدخول.
const salt = randomBytes(16);
const key = await scrypt(password, salt, 64);
const passwordHash = `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;

const existing = await prisma.user.findUnique({ where: { email } });
if (existing) {
  console.error("A user with this email already exists. Nothing was changed.");
  process.exit(1);
}

const school = await prisma.school.create({ data: { name: "مدرسة تجريبية" } });
await prisma.user.create({
  data: {
    schoolId: school.id,
    email,
    fullName: "مدير تجريبي",
    passwordHash,
    role: "PRINCIPAL",
  },
});

console.log(`Created test principal for school ${school.id}.`);
await prisma.$disconnect();
