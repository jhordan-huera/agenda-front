/**
 * Recuperar la contraseña (spec 054): `npm run check:password-recovery`.
 *
 * - generateTemporaryPassword: el largo, sólo letras y números que no se confunden, y al azar.
 * - newPasswordSchema y forgotPasswordSchema: mínimo 8, que coincidan y el email.
 * - El mensaje de WhatsApp del super admin y los emails de la contraseña temporal.
 *
 * Node ejecuta los .ts directamente; el gancho de abajo resuelve el alias `@/` y los imports sin
 * extensión de src/ como lo hace Vite. Sale con código 1 si algo falla.
 */
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = path.resolve(import.meta.dirname, "../src");
registerHooks({
  resolve(specifier, context, nextResolve) {
    const parent = context.parentURL?.startsWith("file:") ? fileURLToPath(context.parentURL) : "";
    const base = specifier.startsWith("@/")
      ? path.join(SRC, specifier.slice(2))
      : specifier.startsWith(".") && parent.startsWith(SRC) && !/\.[cm]?[jt]sx?$/.test(specifier)
        ? path.resolve(path.dirname(parent), specifier)
        : null;
    if (!base) return nextResolve(specifier, context);
    const found = [`${base}.ts`, path.join(base, "index.ts")].find((candidate) => existsSync(candidate));
    if (!found) throw new Error(`${specifier} (desde ${path.relative(SRC, parent)}): no es un .ts de src/.`);
    return nextResolve(pathToFileURL(found).href, context);
  },
});

const { generateTemporaryPassword, TEMPORARY_PASSWORD_ALPHABET, TEMPORARY_PASSWORD_LENGTH, TEMPORARY_PASSWORD_MINUTES } = await import(
  "../src/lib/constants/auth.ts"
);
const { forgotPasswordSchema, newPasswordSchema } = await import("../src/lib/validations/auth.ts");
const { buildTemporaryPasswordMessage } = await import("../src/lib/whatsapp.ts");
const { emailTemplates } = await import("../src/lib/email/templates.ts");

let failures = 0;
const ok = (cond: unknown, label: string, extra?: unknown) => {
  if (cond) console.log("  ✓", label);
  else {
    failures++;
    console.log("  ✗", label, extra === undefined ? "" : JSON.stringify(extra).slice(0, 600));
  }
};

console.log("La contraseña temporal");
const samples = Array.from({ length: 300 }, () => generateTemporaryPassword());
ok(samples.every((sample) => sample.length === TEMPORARY_PASSWORD_LENGTH), `${TEMPORARY_PASSWORD_LENGTH} caracteres`);
ok(samples.every((sample) => [...sample].every((char) => TEMPORARY_PASSWORD_ALPHABET.includes(char))), "sólo del alfabeto");
ok(!/[0O1lI]/.test(TEMPORARY_PASSWORD_ALPHABET), "sin 0, O, 1, l ni I", TEMPORARY_PASSWORD_ALPHABET);
ok(new Set(samples).size === samples.length, "todas distintas");
const used = new Set(samples.join(""));
ok(used.size > TEMPORARY_PASSWORD_ALPHABET.length * 0.9, "usa casi todo el alfabeto", used.size);
ok(TEMPORARY_PASSWORD_MINUTES === 60, "vence en 1 hora (decisión del dueño)");

console.log("\nLos formularios");
// Contraseñas de prueba al azar, en variables «…Password» (GitGuardian, 2026-11-18).
const goodPassword = generateTemporaryPassword(12);
const shortPassword = generateTemporaryPassword(5);
ok(!newPasswordSchema.safeParse({ newPassword: shortPassword, confirmPassword: shortPassword }).success, "la nueva: mínimo 8 caracteres");
ok(!newPasswordSchema.safeParse({ newPassword: goodPassword, confirmPassword: `${goodPassword}x` }).success, "tiene que coincidir con la confirmación");
ok(newPasswordSchema.safeParse({ newPassword: goodPassword, confirmPassword: goodPassword }).success, "una buena pasa");
const forgot = forgotPasswordSchema.safeParse({ email: "  Ana@Ejemplo.COM " });
ok(forgot.success && forgot.data.email === "ana@ejemplo.com", "el email, sin espacios y en minúsculas", forgot);
ok(!forgotPasswordSchema.safeParse({ email: "no es un email" }).success, "un email mal escrito no pasa");

console.log("\nEl mensaje de WhatsApp");
const samplePassword = generateTemporaryPassword();
const message = buildTemporaryPasswordMessage({
  firstName: "Valeria",
  email: "valeria@ejemplo.com",
  password: samplePassword,
  loginUrl: "https://agenda-3-6-0.vercel.app/login",
});
ok(message.startsWith("Hola Valeria"), "saluda por el nombre");
ok(message.split("\n").includes(samplePassword), "la contraseña sola en su renglón", message);
ok(message.includes("https://agenda-3-6-0.vercel.app/login") && message.includes("valeria@ejemplo.com"), "la dirección y su email");
ok(/crear tu propia contraseña/.test(message), "dice que al entrar crea la suya");

console.log("\nLos emails");
const temporary = emailTemplates.temporaryPassword({
  firstName: "Valeria",
  email: "valeria@ejemplo.com",
  password: "••••••••",
  minutes: 60,
  loginUrl: "https://agenda-3-6-0.vercel.app/login",
});
ok(temporary.subject === "Tu contraseña temporal", "el asunto", temporary.subject);
ok(/1 hora/.test(temporary.body) && /una sola vez/.test(temporary.body), "vence en 1 hora y sirve una vez", temporary.body);
ok(/sigue funcionando/.test(temporary.body), "la de siempre sigue funcionando");
ok(temporary.html.includes("••••••••"), "con la contraseña donde la pone el mailer");
const support = emailTemplates.passwordChanged("Valeria", "valeria@ejemplo.com", "••••••••", "https://agenda-3-6-0.vercel.app/login");
ok(/temporal/.test(support.body) && /crear la tuya/.test(support.body), "la del soporte dice que es temporal", support.body);
const changed = emailTemplates.ownPasswordChanged({
  firstName: "Valeria",
  email: "valeria@ejemplo.com",
  at: "20 de noviembre de 2026, 10:00",
  ip: "190.1.2.3",
  browser: "Chrome",
  recoverUrl: "https://agenda-3-6-0.vercel.app/forgot-password",
});
ok(changed.subject === "Cambiaste tu contraseña" && /Recuperar el acceso/.test(changed.body), "«Cambiaste tu contraseña», con «Recuperar el acceso»");

console.log(failures ? `\n${failures} comprobación(es) fallaron` : "\nTodas las comprobaciones de recuperar la contraseña pasaron");
process.exit(failures ? 1 : 0);
