import { useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePatientSession } from "@/hooks/queries/use-patient-account";
import type { PatientAccount, PatientInvite } from "@/types";
import { firstName } from "./patient-card-text";
import { PatientLoginForm } from "./patient-login-form";
import { PatientSignupForm } from "./patient-signup-form";

type AuthTab = "entrar" | "crear";

const STEPS = [
  "Crea tu cuenta con tu teléfono y una contraseña o un PIN de 4 números.",
  "En tu próxima cita, muestra tu QR: el consultorio lo escanea y lo une a tu ficha.",
  "Después de ese escaneo, tu tarjeta aparece aquí con tus sellos y tus premios. Cada cita atendida suma un sello.",
];

/**
 * «Mi tarjeta» sin sesión (spec 052): qué es la cuenta (sólo para la tarjeta de fidelización; reservar no la pide),
 * «Entrar» y «Crear mi cuenta», y cómo empieza a sumar.
 */
export function PatientAuth({ invite = null }: { invite?: PatientInvite | null }) {
  const { setAccount } = usePatientSession();
  // Desde el QR del consultorio, casi siempre es alguien sin cuenta: «Crear mi cuenta» primero.
  const [tab, setTab] = useState<AuthTab>(invite ? "crear" : "entrar");
  const [phone, setPhone] = useState("");

  const signedIn = (created: boolean) => (account: PatientAccount) => {
    setAccount(account);
    toast.success(created ? "Listo, ya tienes tu cuenta." : `Hola, ${firstName(account.name)}.`);
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-[1.625rem] leading-tight font-bold tracking-[-0.02em]">
          {invite ? (invite.programName ? `«${invite.programName}»` : `La tarjeta de ${invite.name}`) : "Tu tarjeta de fidelización"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {invite
            ? `${invite.name} te invita a su tarjeta de fidelización: junta un sello con cada cita atendida y gana sus premios. Para reservar una cita no necesitas cuenta: esta cuenta es sólo para tu tarjeta.`
            : "Junta sellos con cada cita atendida y gana los premios de tu consultorio. Para reservar una cita no necesitas cuenta: esta cuenta es sólo para tu tarjeta."}
        </p>
      </div>

      <section aria-label="Tu cuenta" className="rounded-2xl border bg-card p-4 sm:p-5">
        <Tabs value={tab} onValueChange={(value) => setTab(value as AuthTab)}>
          <TabsList className="w-full group-data-horizontal/tabs:h-11">
            <TabsTrigger value="entrar">Entrar</TabsTrigger>
            <TabsTrigger value="crear">Crear mi cuenta</TabsTrigger>
          </TabsList>
          <TabsContent value="entrar" className="pt-4">
            <PatientLoginForm phone={phone} onPhoneChange={setPhone} onSignedIn={signedIn(false)} />
          </TabsContent>
          <TabsContent value="crear" className="pt-4">
            <PatientSignupForm phone={phone} onPhoneChange={setPhone} onSignedIn={signedIn(true)} onGoToLogin={() => setTab("entrar")} />
          </TabsContent>
        </Tabs>
      </section>

      <section aria-labelledby="patient-how-title">
        <h2 id="patient-how-title" className="text-sm font-semibold">
          Cómo funciona
        </h2>
        <ol className="mt-3 space-y-3 text-sm">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span
                aria-hidden
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground"
              >
                {index + 1}
              </span>
              <span className="pt-0.5 text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
