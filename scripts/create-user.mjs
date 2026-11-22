// إنشاء مدرسة ومستخدم مدير تجريبي. تُشغَّل يدويًا من جهازك.
// لا تُكتب كلمة المرور في الملف ولا في المحادثة؛ تُمرَّر كمتغير بيئة عند التشغيل فقط.
//
//   DATABASE_URL="..." TEST_EMAIL="you@example.com" TEST_PASSWORD="..." node scripts/create-user.mjs
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);

// نص الخطأ فقط، بدون مكدّس الاستدعاء، مع إخفاء أي رابط قاعدة بيانات أو كلمة مرور.
function short(err) {
  const first = String(err?.message ?? err).split("\n").find((l) => l.trim()) ?? "unknown error";
  return first
    .replace(/postgres(ql)?:\/\/\S+/gi, "[database-url-hidden]")
    .replace(/TEST_PASSWORD=\S+/g, "TEST_PASSWORD=[hidden]")
    .slice(0, 300);
}

async function main() {
  const email = (process.env.TEST_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.TEST_PASSWORD ?? "";
  const url = process.env.DATABASE_URL ?? "";

  if (!/^postgres(ql)?:\/\//.test(url)) {
    throw new Error("DATABASE_URL must start with postgresql:// (no spaces or quotes around it)");
  }
  if (!email.includes("@") || password.length < 12) {
    throw new Error("TEST_EMAIL must be an email and TEST_PASSWORD at least 12 characters");
  }

  // استيراد Prisma بعد التحقق من المتغيرات حتى تظهر الرسائل الواضحة أولًا.
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    if (await prisma.user.findUnique({ where: { email } })) {
      throw new Error("a user with this email already exists; nothing was changed");
    }

    // نفس صيغة src/lib/password.ts حتى يقبلها تسجيل الدخول.
    const salt = randomBytes(16);
    const key = await scrypt(password, salt, 64);
    const passwordHash = `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;

    const school = await prisma.school.create({ data: { name: "مدرسة تجريبية" } });
    await prisma.user.create({
      data: {
        schoolId: school.id,
        email,
        fullName: "مدير تجريبي",
        passwordHash,
        role: "PRINCIPAL",
        mustChangePassword: true,
      },
    });
    console.log("OK: test principal created. Sign in and change the password when prompted.");
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main().catch((err) => {
  console.error("FAILED:", short(err));
  process.exit(1);
});
