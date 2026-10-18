import type { AnchorHTMLAttributes, ReactNode, Ref } from "react";
import { Link } from "react-router";
import { SIGNUP_CONTACT_LABEL, type SignupContact } from "./use-signup-contact";

interface SignupLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "children"> {
  contact: SignupContact;
  /** El texto con el registro abierto («Crear mi agenda», «Crear cuenta»…). */
  registerLabel: ReactNode;
  /** Lo que va después del texto (p. ej. una flecha), en los dos casos. */
  after?: ReactNode;
  ref?: Ref<HTMLAnchorElement>;
}

/**
 * Los «Crear cuenta» de la portada (spec 022): con el registro abierto llevan a /register; cerrado, dicen
 * «Quiero mi agenda» y abren el WhatsApp (en otra pestaña) o el email de soporte con el mensaje escrito.
 * Va dentro de `<Button asChild>` o solo: recibe sus clases.
 */
export function SignupLink({ contact, registerLabel, after, ref, ...props }: SignupLinkProps) {
  if (contact.kind === "register") {
    return (
      <Link ref={ref} to={contact.to} {...props}>
        {registerLabel}
        {after}
      </Link>
    );
  }
  return (
    <a ref={ref} href={contact.href} {...(contact.kind === "whatsapp" ? { target: "_blank", rel: "noreferrer" } : {})} {...props}>
      {SIGNUP_CONTACT_LABEL}
      {after}
    </a>
  );
}
