import { clientRequiredFieldsOf } from "@/lib/constants/business";
import { joinNames } from "@/lib/format";
import { missingRequiredFields } from "@/lib/validations/client";
import type { Business, Client, ClientRequiredField } from "@/types";

/** Cómo se nombra cada dato en los textos: «cédula» y, con el artículo, «la cédula». */
const FIELD_WORDS: Record<ClientRequiredField, { word: string; withArticle: string }> = {
  documentId: { word: "cédula", withArticle: "la cédula" },
  email: { word: "email", withArticle: "el email" },
  phone: { word: "teléfono", withArticle: "el teléfono" },
  address: { word: "dirección", withArticle: "la dirección" },
};

/**
 * «Por completar» (spec 012): los datos obligatorios de hoy del negocio que le faltan a un paciente. Se
 * calcula en el navegador con lo que el panel ya tiene. Sin el negocio (aún cargando), nada. Un paciente
 * «Por verificar» (spec 009) no tiene cédula a propósito: lo suyo es unirlo a su ficha, no completarlo.
 */
export function clientMissingFields(
  client: Client,
  business: Pick<Business, "clientRequiredFields"> | null | undefined,
): ClientRequiredField[] {
  if (!business || client.claimedClientId) return [];
  return missingRequiredFields(client, clientRequiredFieldsOf(business));
}

/** «Falta la cédula y el email»: lo que le falta a una fila de la importación. */
export const missingRowText = (missing: readonly ClientRequiredField[]) =>
  `Falta ${joinNames(missing.map((field) => FIELD_WORDS[field].withArticle))}`;

/** «Faltan datos: cédula y email» (con uno, «Falta un dato: email»): la ficha y la marca de la lista. */
export const missingDataText = (missing: readonly ClientRequiredField[]) =>
  `${missing.length === 1 ? "Falta un dato" : "Faltan datos"}: ${joinNames(missing.map((field) => FIELD_WORDS[field].word))}`;
