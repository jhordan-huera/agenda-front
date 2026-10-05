import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Logo } from "@/components/shared/logo";
import { PageTitle } from "@/components/shared/page-title";
import { SupportContact } from "@/components/shared/support-contact";
import { usePlatformSettings } from "@/hooks/queries/use-admin";
import { APP_NAME, DEFAULT_SUPPORT_EMAIL } from "@/lib/constants/app";

const LAST_UPDATED = "5 de octubre de 2026";

/**
 * Política de privacidad (Ley Orgánica de Protección de Datos Personales del Ecuador, LOPDP).
 * Pública: la enlazan la web, el inicio de sesión y la página de reservas.
 */
export default function PrivacyPage() {
  const settings = usePlatformSettings();
  const contact = (
    <SupportContact
      email={settings.data?.supportEmail ?? DEFAULT_SUPPORT_EMAIL}
      phone={settings.data?.supportPhone}
      message={`Hola, tengo una consulta sobre mis datos personales en ${APP_NAME}.`}
    />
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <PageTitle title="Política de privacidad" />
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" aria-label={`Ir al inicio de ${APP_NAME}`}>
            <Logo />
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden /> Inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <article className="space-y-8 rounded-2xl border bg-background p-6 text-sm leading-relaxed sm:p-10">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Política de privacidad</h1>
            <p className="text-muted-foreground">Última actualización: {LAST_UPDATED}</p>
            <p>
              En {APP_NAME} cuidamos los datos de los profesionales que usan la plataforma y de las personas que reservan
              con ellos. Aquí explicamos, sin letra pequeña, qué datos tratamos, para qué, con quién los compartimos, cuánto
              tiempo los guardamos y cómo puedes ejercer tus derechos, según la Ley Orgánica de Protección de Datos
              Personales del Ecuador (LOPDP).
            </p>
          </div>

          <Section title="1. Quiénes somos y cómo contactarnos">
            <p>
              {APP_NAME} es una plataforma de agenda y reservas en línea para profesionales y negocios. Para cualquier
              consulta sobre tus datos escríbenos a {contact}.
            </p>
          </Section>

          <Section title="2. Quién decide sobre tus datos">
            <ul>
              <li>
                <strong>Si tienes una cuenta en {APP_NAME}</strong> (eres profesional o parte de su equipo), {APP_NAME} es el
                responsable de los datos de tu cuenta.
              </li>
              <li>
                <strong>Si reservas una cita o eres cliente o paciente de un negocio</strong>, ese negocio es el responsable
                de tus datos: decide qué registra y para qué. {APP_NAME} los trata por cuenta del negocio (encargado del
                tratamiento) y sólo para prestarle el servicio. Para ejercer tus derechos, dirígete primero al negocio; si nos
                escribes a nosotros, se lo trasladaremos.
              </li>
            </ul>
          </Section>

          <Section title="3. Qué datos tratamos">
            <ul>
              <li>
                <strong>Cuentas:</strong> nombre, apellido, email, teléfono y contraseña (guardada cifrada: nadie puede
                leerla, ni nosotros).
              </li>
              <li>
                <strong>Negocios:</strong> nombre, tipo de negocio, datos de contacto, dirección y ubicación en el mapa,
                horarios, servicios y precios.
              </li>
              <li>
                <strong>Clientes y reservas:</strong> nombre, cédula, email, teléfono, dirección, notas y citas. En las citas
                a domicilio, la dirección y el punto marcado en el mapa.
              </li>
              <li>
                <strong>Historia clínica:</strong> si el profesional la usa, datos de salud de sus pacientes (antecedentes,
                evoluciones, cuestionarios y archivos como radiografías o exámenes). Son datos sensibles y tienen protección
                reforzada (ver punto 6).
              </li>
              <li>
                <strong>Registro de actividad (auditoría):</strong> quién hizo cada acción y cuándo (por ejemplo, crear una
                cita o editar un cliente) y qué cambió. En los inicios y cierres de sesión, y en los intentos fallidos,
                también la dirección IP y el navegador desde el que se hizo.
              </li>
              <li>
                <strong>Emails enviados:</strong> copia de los emails automáticos (confirmaciones, recordatorios y avisos) y
                si se entregaron.
              </li>
            </ul>
          </Section>

          <Section title="4. Para qué los usamos y con qué base legal">
            <ul>
              <li>
                <strong>Prestar el servicio</strong> (agenda, página de reservas, recordatorios y emails de las citas): es
                necesario para cumplir el contrato con el negocio y para atender la reserva que solicitas.
              </li>
              <li>
                <strong>Seguridad y prevención de fraude</strong> (registro de actividad, límite de intentos de inicio de
                sesión y alertas de accesos sospechosos): nuestro interés legítimo en proteger las cuentas y los datos.
              </li>
              <li>
                <strong>Soporte:</strong> resolver las consultas e incidencias que nos planteas.
              </li>
              <li>
                <strong>Cumplir obligaciones legales</strong> cuando una ley o una autoridad competente lo exija.
              </li>
            </ul>
            <p>
              No vendemos datos, no mostramos publicidad, no los usamos para perfiles comerciales y no tomamos decisiones
              automatizadas sobre las personas. Los emails que enviamos son los del servicio, no promocionales.
            </p>
          </Section>

          <Section title="5. Quién puede ver los datos">
            <ul>
              <li>
                <strong>El equipo de cada negocio</strong>, según su rol. La historia clínica sólo la ven las personas a las
                que el negocio da acceso clínico.
              </li>
              <li>
                <strong>El soporte de {APP_NAME}</strong> puede entrar al panel de un negocio para darle asistencia. Todo lo
                que cambie queda en el registro de actividad del negocio.
              </li>
              <li>
                <strong>Los inicios de sesión, las IP y los navegadores</strong> sólo los ve el equipo de {APP_NAME}, para la
                seguridad de la plataforma.
              </li>
            </ul>
          </Section>

          <Section title="6. Datos de salud">
            <p>
              El profesional es responsable de obtener el consentimiento de su paciente antes de registrar su historia
              clínica (la plataforma guarda la fecha de ese consentimiento). Las evoluciones registradas no se pueden
              modificar ni borrar, sólo completar con una aclaración. Queda registrado quién abre cada historia clínica y
              cada archivo. Los archivos se guardan en un almacenamiento privado y sólo se abren con enlaces temporales de
              unos minutos.
            </p>
          </Section>

          <Section title="7. Proveedores y transferencias internacionales">
            <p>Para funcionar usamos estos proveedores, que tratan los datos sólo para prestarnos su servicio:</p>
            <ul>
              <li>
                <strong>Supabase</strong> (base de datos y archivos) y <strong>Vercel</strong> (servidores de la aplicación),
                en Estados Unidos.
              </li>
              <li>
                <strong>Google (Gmail)</strong>, para enviar los emails.
              </li>
              <li>
                <strong>GitHub</strong>, que ejecuta las tareas automáticas (por ejemplo, los recordatorios de las citas).
              </li>
              <li>
                <strong>OpenFreeMap</strong>, que dibuja los mapas: tu navegador le pide las imágenes del mapa, así que ve tu
                dirección IP.
              </li>
              <li>
                <strong>ntfy y healthchecks.io</strong>, para avisos internos de funcionamiento al equipo de {APP_NAME}, con
                datos mínimos (cifras y, en las alertas de seguridad, el email de la cuenta parcialmente oculto).
              </li>
            </ul>
            <p>
              Al usar {APP_NAME}, los datos se transfieren y se guardan fuera del Ecuador, principalmente en Estados Unidos.
              Elegimos proveedores reconocidos que cifran las comunicaciones y controlan el acceso a la información.
            </p>
          </Section>

          <Section title="8. Cuánto tiempo los guardamos">
            <ul>
              <li>Los datos de cada negocio, sus clientes y sus citas, mientras el negocio tenga su cuenta.</li>
              <li>
                Al eliminar un negocio se borran de forma definitiva sus datos, sus archivos y las cuentas de su equipo.
              </li>
              <li>
                Registro de actividad: los inicios y cierres de sesión, 90 días; las acciones en el panel, 1 año; los accesos
                y cambios en las historias clínicas, 5 años. Después se borran automáticamente.
              </li>
              <li>
                El negocio decide cuánto tiempo conserva las historias clínicas de sus pacientes, según la normativa de salud
                que le aplique.
              </li>
            </ul>
          </Section>

          <Section title="9. Cómo protegemos los datos">
            <ul>
              <li>Conexiones cifradas (HTTPS) y contraseñas guardadas cifradas.</li>
              <li>Cookie de sesión protegida, accesos por roles y aislamiento entre negocios.</li>
              <li>Límite de intentos de inicio de sesión y alertas ante intentos sospechosos.</li>
              <li>Un registro de actividad que nadie puede modificar ni borrar desde la aplicación.</li>
            </ul>
          </Section>

          <Section title="10. Cookies y almacenamiento del navegador">
            <p>
              Usamos una sola cookie, imprescindible para mantener tu sesión iniciada: dura 24 horas o 30 días si eliges
              «recordarme», y se borra al cerrar sesión. El navegador también guarda datos temporales de la pestaña para que
              la aplicación funcione. No usamos cookies de publicidad ni de analítica.
            </p>
          </Section>

          <Section title="11. Tus derechos">
            <p>
              Puedes pedir en cualquier momento <strong>acceder</strong> a tus datos, <strong>rectificarlos y
              actualizarlos</strong>, <strong>eliminarlos</strong>, <strong>oponerte</strong> a su tratamiento,
              <strong> suspenderlo</strong>, recibirlos en un formato que puedas llevar a otro servicio
              (<strong>portabilidad</strong>) y no ser objeto de decisiones basadas sólo en tratamientos automatizados.
            </p>
            <p>
              Escríbenos a {contact}. Si eres cliente o paciente de un negocio, también puedes pedírselo directamente a él.
              Responderemos en un plazo máximo de 15 días. Si no quedas conforme, puedes reclamar ante la Superintendencia de
              Protección de Datos Personales.
            </p>
          </Section>

          <Section title="12. Menores de edad">
            <p>
              Las cuentas de {APP_NAME} son para personas mayores de edad. Cuando un profesional atiende a menores, es quien
              registra sus datos, con el consentimiento de su representante legal.
            </p>
          </Section>

          <Section title="13. Cambios en esta política">
            <p>
              Si cambiamos esta política, publicaremos aquí la nueva versión con su fecha. Si el cambio es importante, lo
              avisaremos por email a los negocios.
            </p>
          </Section>
        </article>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-2">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
