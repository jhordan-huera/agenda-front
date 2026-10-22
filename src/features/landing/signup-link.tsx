import { ArrowRight } from "lucide-react";
import type { AnchorHTMLAttributes, ReactNode, Ref } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

interface SignupCtaProps {
  contact: SignupContact;
  /** El texto con el registro abierto: por defecto, «Crear mi agenda gratis». */
  registerLabel?: ReactNode;
  /** La flecha después del texto (la portada y el cierre; la barra, sin ella). */
  arrow?: boolean;
  className?: string;
}

/**
 * El botón principal de la portada (spec 032): «Crear mi agenda gratis», en el principal de la marca, el
 * tomate (spec 033: un solo color, sin un naranja aparte), en la barra, la portada y el cierre. Con el
 * registro cerrado, «Quiero mi agenda» (spec 022). Al pasar el ratón, en el claro se oscurece (el del
 * botón de siempre, 7,8:1 con el texto blanco); en el oscuro, donde el texto es oscuro, se aclara (6,6:1):
 * check:contrast, «Botón al pasar». El foco, con el anillo de la marca; sobre el cierre (--shell), quien
 * lo usa pasa el suyo en `className`.
 */
export function SignupCta({ contact, registerLabel = "Crear mi agenda gratis", arrow = false, className }: SignupCtaProps) {
  return (
    <Button asChild className={cn("dark:hover:bg-[color-mix(in_oklch,var(--primary),white_15%)]", className)}>
      <SignupLink
        contact={contact}
        registerLabel={registerLabel}
        after={
          arrow ? (
            <ArrowRight
              aria-hidden
              className="transition-transform duration-150 ease-out-soft group-hover/button:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover/button:translate-x-0"
            />
          ) : undefined
        }
      />
    </Button>
  );
}
