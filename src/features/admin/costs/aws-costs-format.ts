import { capitalize, formatDate } from "@/lib/format";
import type { AwsCosts, AwsMonthCosts, AwsServiceCost, ISODate } from "@/types";

export { formatCostAmount } from "@/lib/constants/business";

/**
 * Piezas comunes de los costos de AWS (spec 031): la página «Costos» y la tarjeta del Inicio de /admin.
 */

/**
 * Los servicios de AWS que usa el backend, en palabras (el nombre de AWS va debajo, más chico). Los demás se
 * muestran con su nombre de AWS tal cual.
 */
const SERVICE_LABELS: Record<string, string> = {
  "AWS Lambda": "La API (Lambda)",
  AmazonCloudWatch: "Registros (CloudWatch)",
  "Amazon CloudWatch": "Registros (CloudWatch)",
  "AWS Data Transfer": "Transferencia de datos",
  "AWS Cost Explorer": "Esta consulta diaria (Cost Explorer)",
  Tax: "Impuestos",
  "Amazon Simple Storage Service": "Archivos (S3)",
  "AWS Key Management Service": "Claves (KMS)",
  "AWS Secrets Manager": "Secretos (Secrets Manager)",
  "Amazon API Gateway": "API Gateway",
};

/** «La API (Lambda)», o el nombre de AWS si no está en la lista. */
export const serviceLabel = (name: string) => SERVICE_LABELS[name] ?? name;

/** «Octubre de 2026»: el mes de facturación de AWS. */
export const awsMonthLabel = (month: ISODate) => capitalize(formatDate(month, "MMMM 'de' yyyy"));

/**
 * Lo gastado por servicio para la lista: los que pasan de $0,00 (también los de menos de un centavo, que se
 * ven «menos de $0,01») y cuántos van en $0,00, que se juntan en una línea.
 */
export function splitServices(services: AwsServiceCost[]): { spent: AwsServiceCost[]; zero: number } {
  const spent = services.filter((service) => service.amount > 0);
  return { spent, zero: services.length - spent.length };
}

/** En centavos, como se ven: «pasa el aviso» es en lo que se ve, no en las fracciones de centavo. */
const cents = (amount: number) => Math.round(amount * 100);

/**
 * Cómo va el mes frente al aviso: `passed`, lo gastado ya lo pasó; `forecast`, todavía no, pero la previsión
 * sí («a este ritmo pasarás tu aviso»); `below`, ni lo uno ni lo otro; null, sin aviso.
 */
export function alertState(costs: Pick<AwsCosts, "alertAmount">, latest: Pick<AwsMonthCosts, "usage" | "forecast">): "passed" | "forecast" | "below" | null {
  if (costs.alertAmount === null) return null;
  if (cents(latest.usage) > cents(costs.alertAmount)) return "passed";
  if (latest.forecast !== null && cents(latest.forecast) > cents(costs.alertAmount)) return "forecast";
  return "below";
}
