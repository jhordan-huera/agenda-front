/**
 * Tarjeta de fidelización (spec 052): `npm run check:loyalty`.
 *
 * - describeBenefit y priceAfterReward con los cinco tipos (el precio nunca baja de 0).
 * - levelOf: Clásica, Plata y Oro.
 * - El código de la recompensa: formatRewardCode y normalizeRewardCode.
 * - readQrToken: el enlace /q/<token>, el token solo y lo que no es un QR de paciente.
 * - Las redes: normalizeSocialLink (@usuario, enlace, otro dominio y vacío), socialLinksOf y socialLinksSchema.
 * - normalizePhone: 0991234567, +593 99 123 4567 y basura.
 * - Los textos del panel: lo que falta, las casillas de la ficha, la línea de cada recompensa, el precio al canjear y
 *   los mensajes de WhatsApp.
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

const {
  describeBenefit,
  formatRewardCode,
  levelOf,
  normalizeRewardCode,
  normalizeSocialLink,
  patientQrUrl,
  priceAfterReward,
  readQrToken,
  socialLinksOf,
} = await import("../src/lib/constants/loyalty.ts");
const { normalizePhone } = await import("../src/lib/validations/fields.ts");
const { isEasyPassword, patientSignupSchema } = await import("../src/lib/validations/loyalty.ts");
const { socialLinksSchema } = await import("../src/lib/validations/business.ts");
const { describeMissing, progressSlots, redeemPriceNote, rewardDetail, sortRewards } = await import("../src/features/loyalty/loyalty-text.ts");
const { buildLoyaltyWhatsAppMessage, buildPatientResetWhatsAppMessage } = await import("../src/lib/whatsapp.ts");
const { nextPrizeText } = await import("../src/features/patient/patient-card-text.ts");

let failures = 0;
const ok = (cond: unknown, label: string, extra?: unknown) => {
  if (cond) console.log("  ✓", label);
  else {
    failures++;
    console.log("  ✗", label, extra === undefined ? "" : JSON.stringify(extra).slice(0, 600));
  }
};

console.log("describeBenefit: el texto corto de cada tipo");
ok(describeBenefit("percent", 50) === "50 % de descuento", "porcentaje", describeBenefit("percent", 50));
ok(describeBenefit("fixed", 10).endsWith("10 de descuento") && describeBenefit("fixed", 10).includes("$"), "valor fijo", describeBenefit("fixed", 10));
ok(describeBenefit("free_appointment", null) === "Cita gratis", "cita gratis");
ok(describeBenefit("free_service", null, "Limpieza dental") === "Limpieza dental gratis", "servicio gratis, con su nombre");
ok(describeBenefit("free_service", null, null) === "Servicio gratis", "servicio gratis, sin el servicio (se borró)");
ok(describeBenefit("custom", null) === "Beneficio personalizado", "personalizado");

console.log("\npriceAfterReward: el precio de la cita al canjear");
ok(priceAfterReward(40, "percent", 50) === 20, "50 % de $40 = $20", priceAfterReward(40, "percent", 50));
ok(priceAfterReward(33.33, "percent", 10) === 30, "10 % de $33,33 = $30 (redondeado a centavos)", priceAfterReward(33.33, "percent", 10));
ok(priceAfterReward(40, "percent", 100) === 0, "100 % lo deja en $0");
ok(priceAfterReward(40, "fixed", 15) === 25, "$15 menos de $40 = $25", priceAfterReward(40, "fixed", 15));
ok(priceAfterReward(10, "fixed", 25) === 0, "un descuento mayor que el precio: $0, nunca negativo", priceAfterReward(10, "fixed", 25));
ok(priceAfterReward(40, "free_appointment", null) === 0, "cita gratis: $0");
ok(priceAfterReward(40, "free_service", null) === 0, "servicio gratis: $0");
ok(priceAfterReward(40, "custom", null) === 40, "personalizado: no cambia");
ok([0, 5, 40].every((price) => (["percent", "fixed", "free_appointment", "free_service", "custom"] as const).every((kind) => priceAfterReward(price, kind, 500) >= 0)), "ningún tipo deja un precio negativo");

console.log("\nlevelOf: el nivel por número de tarjeta");
ok(levelOf(1) === "classic" && levelOf(2) === "silver" && levelOf(3) === "gold" && levelOf(9) === "gold", "1 Clásica, 2 Plata, 3 y más Oro");

console.log("\nEl código de la recompensa");
ok(formatRewardCode("K7Q3MD") === "K7Q-3MD", "se muestra con el guion", formatRewardCode("K7Q3MD"));
ok(formatRewardCode("ABC") === "ABC", "uno que no tiene 6 caracteres, tal cual");
ok(normalizeRewardCode("k7q 3md") === "K7Q3MD" && normalizeRewardCode(" K7Q-3MD ") === "K7Q3MD", "lo que escribe el equipo, como se guarda");
ok(normalizeRewardCode(formatRewardCode("K7Q3MD")) === "K7Q3MD", "ida y vuelta");

console.log("\nreadQrToken: lo que leyó la cámara");
const TOKEN = "0123456789abcdef0123456789abcdef";
ok(readQrToken(patientQrUrl("https://agenda360.app/", TOKEN)) === TOKEN, "el enlace del QR", patientQrUrl("https://agenda360.app/", TOKEN));
ok(readQrToken(`https://agenda360.app/q/${TOKEN}?x=1`) === TOKEN && readQrToken(`  https://agenda360.app/q/${TOKEN.toUpperCase()}/ `) === TOKEN, "con parámetros, espacios o en mayúsculas");
ok(readQrToken(TOKEN) === TOKEN, "el token solo (pegado)");
ok(readQrToken("https://agenda360.app/book/clinica-sonrisa") === null, "el QR de la página de reservas no sirve");
ok(readQrToken("hola") === null && readQrToken("") === null && readQrToken(`${TOKEN}0`) === null, "basura, vacío o un token de otro largo");
ok(readQrToken(`https://agenda360.app/q/${TOKEN}0`) === null, "un enlace con un token de otro largo");

console.log("\nLas redes del negocio");
ok(normalizeSocialLink("instagram", "@sonrisa") === "https://www.instagram.com/sonrisa", "@usuario de Instagram", normalizeSocialLink("instagram", "@sonrisa"));
ok(normalizeSocialLink("tiktok", "sonrisa.ec") === "https://www.tiktok.com/@sonrisa.ec", "usuario de TikTok (con @ en el enlace)", normalizeSocialLink("tiktok", "sonrisa.ec"));
ok(normalizeSocialLink("facebook", "https://m.facebook.com/ClinicaSonrisa/") === "https://www.facebook.com/ClinicaSonrisa", "el enlace del celular, sin la barra final", normalizeSocialLink("facebook", "https://m.facebook.com/ClinicaSonrisa/"));
ok(normalizeSocialLink("instagram", "instagram.com/sonrisa") === "https://www.instagram.com/sonrisa", "el enlace sin https");
ok(normalizeSocialLink("instagram", "https://evil.example/sonrisa") === null, "otro dominio: se rechaza");
ok(normalizeSocialLink("facebook", "https://www.instagram.com/sonrisa") === null, "el enlace de otra red: se rechaza");
ok(normalizeSocialLink("instagram", "https://www.instagram.com/") === null, "el dominio sin la página: se rechaza");
ok(normalizeSocialLink("facebook", "   ") === "", "vacío: no la tiene");
const links = { facebook: "", instagram: "https://www.instagram.com/sonrisa", tiktok: "" };
ok(JSON.stringify(socialLinksOf(links)) === JSON.stringify([{ key: "instagram", label: "Instagram", url: links.instagram }]), "socialLinksOf: sólo las que tiene", socialLinksOf(links));
ok(socialLinksOf(undefined).length === 0 && socialLinksOf({ facebook: "", instagram: "", tiktok: "" }).length === 0, "sin redes (o un backend que no las manda): nada");
const parsed = socialLinksSchema.safeParse({ facebook: "", instagram: "@sonrisa", tiktok: "" });
ok(parsed.success && parsed.data.instagram === "https://www.instagram.com/sonrisa", "socialLinksSchema guarda el enlace", parsed);
const rejected = socialLinksSchema.safeParse({ facebook: "https://evil.example/x", instagram: "", tiktok: "" });
ok(!rejected.success && rejected.error.issues[0]?.path[0] === "facebook", "socialLinksSchema: el error va en su campo", rejected.success ? null : rejected.error.issues);

console.log("\nnormalizePhone: un solo formato (+593…)");
ok(normalizePhone("0991234567") === "+593991234567", "0991234567", normalizePhone("0991234567"));
ok(normalizePhone("+593 99 123 4567") === "+593991234567", "+593 99 123 4567", normalizePhone("+593 99 123 4567"));
ok(normalizePhone("099-123-4567") === "+593991234567" && normalizePhone("593991234567") === "+593991234567", "con guiones o sin el +");
ok(normalizePhone("hola") === null && normalizePhone("") === null && normalizePhone("123") === null, "basura, vacío o muy corto");

console.log("\nLos textos del panel");
ok(describeMissing(1) === "Le falta 1 cita" && describeMissing(3) === "Le faltan 3 citas", "lo que le falta");
ok(JSON.stringify(progressSlots(3, { visitsRequired: 5 })) === JSON.stringify({ slots: 5, filled: 3 }), "las casillas hasta el próximo premio");
ok(JSON.stringify(progressSlots(12, null)) === "null" && progressSlots(2, { visitsRequired: 20 }) === null, "más de 10: la barra");
ok(progressSlots(0, null) === null, "sin sellos ni premio: sin casillas");
const base = { expiresAt: null, redeemedAt: null, redeemedByName: null, voidedAt: null, voidedReason: null };
const TZ = "America/Guayaquil";
ok(rewardDetail({ ...base, status: "available" }, TZ) === "No vence", "disponible sin vencimiento");
ok(rewardDetail({ ...base, status: "available", expiresAt: "2026-12-12T17:00:00.000Z" }, TZ).startsWith("Vence el 12"), "disponible con vencimiento", rewardDetail({ ...base, status: "available", expiresAt: "2026-12-12T17:00:00.000Z" }, TZ));
ok(rewardDetail({ ...base, status: "redeemed", redeemedAt: "2026-11-16T17:00:00.000Z", redeemedByName: "Ana Ruiz" }, TZ).endsWith("por Ana Ruiz"), "canjeada, por quién");
ok(rewardDetail({ ...base, status: "voided", voidedAt: "2026-11-16T17:00:00.000Z", voidedReason: "Se corrigió una cita atendida" }, TZ).endsWith(": Se corrigió una cita atendida"), "anulada, con el motivo");
const order = sortRewards([
  { id: "a", status: "redeemed" as const, unlockedAt: "2026-11-10T00:00:00Z" },
  { id: "b", status: "available" as const, unlockedAt: "2026-11-01T00:00:00Z" },
  { id: "c", status: "voided" as const, unlockedAt: "2026-11-12T00:00:00Z" },
]).map((reward) => reward.id);
ok(order.join() === "b,c,a", "las disponibles primero; después, las más recientes", order);
ok(redeemPriceNote({ kind: "percent", value: 50 }, { price: 40, paid: false }) === "El precio de la cita baja de $40 a $20.", "el precio baja", redeemPriceNote({ kind: "percent", value: 50 }, { price: 40, paid: false }));
ok(redeemPriceNote({ kind: "percent", value: 50 }, { price: 40, paid: true }).includes("ya está pagada"), "una cita pagada no cambia");
ok(redeemPriceNote({ kind: "custom", value: null }, { price: 40, paid: false }).includes("no cambia"), "personalizado no cambia");
ok(redeemPriceNote({ kind: "free_service", value: null }, null).includes("ninguna cita"), "sin cita");

console.log("\nLos mensajes de WhatsApp");
const common = { clientName: "Ana María Pérez", businessName: "Clínica Sonrisa", programName: "Club Sonrisa", stamps: 4, bookingUrl: "https://ejemplo.invalid/book/clinica-sonrisa" };
const one = buildLoyaltyWhatsAppMessage({ ...common, next: { name: "Limpieza con 50 % de descuento", missing: 1 }, availableRewards: 0 });
ok(one.startsWith("Hola Ana, te escribimos de Clínica Sonrisa. Te falta 1 cita para ganar «Limpieza con 50 % de descuento»") && one.endsWith(common.bookingUrl), "le falta 1 cita, con el enlace para reservar", one);
const more = buildLoyaltyWhatsAppMessage({ ...common, next: { name: "Blanqueamiento", missing: 3 }, availableRewards: 2 });
ok(more.includes("Te faltan 3 citas") && more.includes("ya tienes 2 premios por canjear"), "le faltan 3 y tiene premios", more);
const prizes = buildLoyaltyWhatsAppMessage({ ...common, next: null, availableRewards: 1 });
ok(prizes.includes("Tienes 1 premio por canjear") && prizes.includes("úsalo"), "sin próximo premio, con uno por canjear", prizes);
const reset = buildPatientResetWhatsAppMessage({ clientName: "Ana María", businessName: "Clínica Sonrisa", url: "https://ejemplo.invalid/mi-tarjeta/clave/abc", hours: 24 });
ok(reset.startsWith("Hola Ana,") && reset.includes("https://ejemplo.invalid/mi-tarjeta/clave/abc") && reset.includes("24 horas") && reset.includes("una sola vez"), "el enlace de la contraseña", reset);

const benefits = [{ visitsRequired: 5, name: "Kit", description: "", conditions: "", validDays: null }];
const oneLeft = nextPrizeText({ slots: 5, stamps: 4, benefits, next: { benefitId: "b", name: "Kit", visitsRequired: 5, missing: 1 } });
ok(oneLeft === "Te falta 1 cita para Kit.", "la tarjeta del paciente: «Te falta 1 cita» (en singular)", oneLeft);
const threeLeft = nextPrizeText({ slots: 5, stamps: 2, benefits, next: { benefitId: "b", name: "Kit", visitsRequired: 5, missing: 3 } });
ok(threeLeft === "Te faltan 3 citas para Kit.", "y «Te faltan 3 citas»", threeLeft);

console.log("\nLa contraseña del paciente: también un PIN de 4 números (pedido del dueño)");
const signup = (password: string) => patientSignupSchema.safeParse({ name: "Ana Pérez", phone: "0991234567", password });
ok(signup("4827").success, "un PIN de 4 números que no es de los fáciles, aceptado");
ok(signup("secreta123").success, "una contraseña de siempre, también");
ok(!signup("482").success, "menos de 4, no");
for (const easy of ["0000", "1111", "1234", "4321", "0123", "7890", "1212", "1122", "1990", "2024", "2580", "12345678", "abcd"]) {
  ok(isEasyPassword(easy) && !signup(easy).success, `«${easy}» es de los fáciles`);
}
for (const fine of ["4827", "7351", "1593", "2026a", "luna-azul"]) ok(!isEasyPassword(fine), `«${fine}» no es de los fáciles`);
const easyPin = signup("1234");
ok(!easyPin.success && easyPin.error.issues[0]?.message === "Ese PIN es muy fácil de adivinar: elige otro", "el aviso dice PIN cuando son números", easyPin.error?.issues);

console.log("\nEl QR del consultorio para sus pacientes");
const { patientInviteUrl } = await import("../src/lib/constants/loyalty.ts");
ok(patientInviteUrl("https://agenda360.app/", "clinica-sonrisa") === "https://agenda360.app/mi-tarjeta?consultorio=clinica-sonrisa", "«Mi tarjeta» con el consultorio", patientInviteUrl("https://agenda360.app/", "clinica-sonrisa"));
ok(readQrToken(patientInviteUrl("https://agenda360.app", "clinica-sonrisa")) === null, "«Escanear» no lo confunde con el QR de un paciente");

console.log("\nRevisión del 2026-11-16");
ok(normalizePhone("+593 099 123 4567") === "+593991234567", "«+593 099…»: sin el 0 del número local", normalizePhone("+593 099 123 4567"));
ok(normalizePhone("5930991234567") === "+593991234567", "y «5930…» igual");
const { startsSoon } = await import("../src/lib/constants/loyalty.ts");
ok(startsSoon("10:00", 9 * 60) && startsSoon("10:00", 9 * 60 + 30) && startsSoon("08:00", 15 * 60), "se marca sola desde una hora antes de su inicio (y las que ya empezaron)");
ok(!startsSoon("16:00", 10 * 60) && !startsSoon("10:01", 9 * 60), "no la de más tarde");

if (failures) {
  console.error(`\n${failures} comprobación(es) fallaron`);
  process.exit(1);
}
console.log("\nTodo bien: los beneficios, el precio al canjear, los niveles, el código, el QR, las redes, el teléfono, los textos y el PIN.");
