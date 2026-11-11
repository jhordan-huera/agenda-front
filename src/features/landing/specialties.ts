/*
 * Las páginas por especialidad (spec 041): /psicologos, /fisioterapeutas y /odontologos. Cada una cuenta funciones
 * que ya existen en Agenda360 con el día a día de esa profesión. Las mismas reglas que la portada: sin testimonios,
 * cifras ni precios inventados, sin nombres de clientes, sin planes ni precios, sin la LOPDP (sólo en /privacidad) y
 * sin funciones paradas. Lo comprueba `npm run check:specialties` (scripts/check-specialties.ts), que también lee de
 * aquí el título y la descripción de cada HTML para compartir.
 */

export type SpecialtySlug = "psicologos" | "fisioterapeutas" | "odontologos";

/** La ilustración de una casilla (feature-visuals.tsx), con sus datos de ejemplo. */
export type SpecialtyVisual =
  | { kind: "booking"; service: string; detail: string }
  | { kind: "reminder" }
  | { kind: "week" }
  | { kind: "clinical" }
  | { kind: "files"; title: string; file: string }
  | { kind: "payment" }
  | { kind: "calendar" }
  | { kind: "team" }
  | { kind: "homeVisit" };

/** Un título con una palabra en cursiva: «Tu consulta, sin *perseguir* a nadie.». */
export interface AccentTitle {
  before: string;
  accent: string;
  after: string;
}

export interface Specialty {
  slug: SpecialtySlug;
  /** «Psicólogos», para «Para psicólogos» y los enlaces. */
  name: string;
  /** El título y la descripción para Google y para la vista previa al compartir el enlace. */
  meta: { title: string; description: string };
  hero: AccentTitle & { text: string };
  intro: AccentTitle & { text: string };
  blocks: { label: string; title: string; description: string; visual: SpecialtyVisual }[];
  steps: { title: string; text: string }[];
  questions: { question: string; answer: string }[];
  /** El mensaje ya escrito de «Escríbenos por WhatsApp». */
  whatsappMessage: string;
  /** Los servicios de ejemplo de la semana del panel de marca (spec 043): el de siempre, la primera cita y otro. */
  week: WeekServices;
}

/** Los servicios de ejemplo de la agenda de la semana (week-preview.tsx). */
export interface WeekServices {
  main: string;
  first: string;
  other: string;
}

const PRICE_ANSWER = "Puedes empezar gratis, sin tarjeta. Para los planes con más funciones, escríbenos y te contamos.";

export const SPECIALTIES: Specialty[] = [
  {
    slug: "psicologos",
    name: "Psicólogos",
    week: { main: "Terapia individual", first: "Primera consulta", other: "Terapia de pareja" },
    meta: {
      title: "Agenda360 para psicólogos · Agenda y reservas online",
      description:
        "Tus pacientes agendan su sesión desde tu enlace, reciben el recordatorio y confirman que van. Sesiones online o en pareja e historia clínica privada.",
    },
    hero: {
      before: "Tu consulta, sin",
      accent: "perseguir",
      after: "a nadie.",
      text: "Tus pacientes agendan su sesión desde tu enlace, reciben el recordatorio y confirman que van. Tú te dedicas a la terapia.",
    },
    intro: {
      before: "Lo que pasa entre la",
      accent: "reserva",
      after: "y la sesión.",
      text: "Sin mensajes de ida y vuelta para cuadrar horarios, sin sesiones vacías por olvidos, con tus notas en un solo lugar.",
    },
    blocks: [
      {
        label: "Reservas",
        title: "Tus pacientes agendan solos",
        description: "Compartes tu enlace y eligen la sesión y una hora libre, a cualquier hora. Se acabó coordinar cada horario por WhatsApp.",
        visual: { kind: "booking", service: "Consulta psicológica", detail: "50 min · jueves 30" },
      },
      {
        label: "Recordatorios",
        title: "Menos sesiones perdidas",
        description: "Antes de cada sesión les llega un recordatorio con el botón «Confirmo que voy». Si no pueden, cancelan a tiempo y la hora queda libre.",
        visual: { kind: "reminder" },
      },
      {
        label: "Sesiones",
        title: "Semanales, presenciales u online",
        description: "Agendas el proceso de una vez: cada semana, cada 2 semanas o cada mes. En las sesiones online, el enlace de tu videollamada va en la cita.",
        visual: { kind: "week" },
      },
      {
        label: "Historia clínica",
        title: "Tus notas de sesión, privadas",
        description: "Motivo de consulta, evoluciones con formatos de psicología y escalas que se califican solas. Ni el soporte de Agenda360 puede abrirlas.",
        visual: { kind: "clinical" },
      },
      {
        label: "Pagos",
        title: "El comprobante, antes de la sesión",
        description: "Tu paciente ve tus datos bancarios y sube el comprobante desde su celular. Tú marcas la sesión como pagada.",
        visual: { kind: "payment" },
      },
      {
        label: "Calendario",
        title: "Tus sesiones, en tu celular",
        description: "Si lo activas, cada sesión te llega como invitación a Google, iPhone u Outlook, y se actualiza si cambia.",
        visual: { kind: "calendar" },
      },
    ],
    steps: [
      { title: "Crea tu agenda", text: "Pones tus horarios y tus servicios: sesión individual, de pareja u online." },
      { title: "Comparte tu enlace", text: "En tu WhatsApp, tu Instagram o tu web. Tus pacientes reservan desde ahí." },
      { title: "Atiende", text: "Ves tus sesiones del día y de la semana; los recordatorios salen solos." },
    ],
    questions: [
      {
        question: "¿Puedo atender sesiones online?",
        answer: "Sí. En la cita va el enlace de tu videollamada, y tu paciente lo recibe con su confirmación y su recordatorio.",
      },
      {
        question: "¿Sirve para terapia de pareja o familiar?",
        answer: "Sí. Una sesión puede tener hasta 3 pacientes, cada uno con su recordatorio. Lo activamos para tu consultorio.",
      },
      {
        question: "¿Quién puede leer mis notas de sesión?",
        answer: "Sólo tú y las personas de tu equipo que autorices. Ni el soporte de Agenda360 puede abrirlas.",
      },
      {
        question: "¿Y si un paciente no puede venir?",
        answer: "Cancela desde su enlace con la anticipación que tú pongas, y la hora queda libre para otro paciente.",
      },
      { question: "¿Cuánto cuesta?", answer: PRICE_ANSWER },
    ],
    whatsappMessage: "Hola, soy psicólogo/a y quiero saber más de Agenda360.",
  },
  {
    slug: "fisioterapeutas",
    week: { main: "Rehabilitación", first: "Valoración inicial", other: "Sesión a domicilio" },
    name: "Fisioterapeutas",
    meta: {
      title: "Agenda360 para fisioterapeutas · Agenda y reservas online",
      description:
        "Agenda tus sesiones en el consultorio o a domicilio, con planes de sesiones que se repiten, recordatorios e historia clínica con evoluciones y exámenes.",
    },
    hero: {
      before: "Tus sesiones, en el consultorio o",
      accent: "a domicilio",
      after: ".",
      text: "Tus pacientes reservan desde tu enlace, cada plan de sesiones queda agendado de una vez y llegas a cada visita con la dirección y el mapa.",
    },
    intro: {
      before: "De la",
      accent: "primera",
      after: "sesión al alta.",
      text: "Planes de varias sesiones, visitas a domicilio y la evolución de cada paciente, en un solo lugar.",
    },
    blocks: [
      {
        label: "Domicilio",
        title: "Visitas a domicilio, con el mapa",
        description: "Tu paciente marca su ubicación al reservar y tú la ves en la cita, con el botón para llegar.",
        visual: { kind: "homeVisit" },
      },
      {
        label: "Planes",
        title: "El plan de sesiones, agendado de una vez",
        description: "Repites la cita cada semana, cada 2 semanas o cada mes, de 2 a 24 sesiones. Antes de crearlas ves la lista de fechas.",
        visual: { kind: "week" },
      },
      {
        label: "Historia clínica",
        title: "Evoluciones y exámenes en su ficha",
        description: "Escribes la evolución de cada sesión y adjuntas radiografías, exámenes o PDFs. Sólo lo ven tú y quien autorices.",
        visual: { kind: "files", title: "Evolución · sesión 6", file: "rx-rodilla.jpg" },
      },
      {
        label: "Equipo",
        title: "Varios fisioterapeutas, cada uno con su agenda",
        description: "Cada uno con su horario y su color. Recepción agenda para todos y cada profesional ve lo suyo.",
        visual: { kind: "team" },
      },
      {
        label: "Recordatorios",
        title: "Menos sesiones perdidas",
        description: "Antes de cada sesión les llega un recordatorio con «Confirmo que voy». Si no pueden, cancelan a tiempo.",
        visual: { kind: "reminder" },
      },
      {
        label: "Pagos",
        title: "Cobro por transferencia",
        description: "Tu paciente ve tus datos bancarios y te sube el comprobante desde su celular. Tú marcas la sesión como pagada.",
        visual: { kind: "payment" },
      },
    ],
    steps: [
      { title: "Crea tu agenda", text: "Pones tus horarios y tus servicios: en el consultorio, a domicilio o los dos." },
      { title: "Comparte tu enlace", text: "En tu WhatsApp, tu Instagram o tu web. Tus pacientes reservan desde ahí." },
      { title: "Atiende", text: "Ves tus sesiones y tus visitas del día; los recordatorios salen solos." },
    ],
    questions: [
      {
        question: "¿Puedo atender a domicilio y en el consultorio?",
        answer: "Sí. Cada servicio puede ser en tu consultorio, a domicilio o los dos, y tu paciente elige al reservar.",
      },
      {
        question: "¿Puedo agendar un plan de varias sesiones de una vez?",
        answer: "Sí. Repites la cita cada semana, cada 2 semanas o cada mes, de 2 a 24 citas, y ves las fechas antes de crearlas.",
      },
      {
        question: "¿Puedo guardar radiografías y exámenes?",
        answer: "Sí, en la historia clínica de cada paciente: fotos y PDFs. Sólo los ven tú y las personas que autorices.",
      },
      {
        question: "¿Sirve para un centro con varios fisioterapeutas?",
        answer: "Sí. Cada uno tiene su agenda, y cada persona del equipo entra con su rol: administración, recepción o profesional.",
      },
      { question: "¿Cuánto cuesta?", answer: PRICE_ANSWER },
    ],
    whatsappMessage: "Hola, soy fisioterapeuta y quiero saber más de Agenda360.",
  },
  {
    slug: "odontologos",
    week: { main: "Limpieza dental", first: "Primera consulta", other: "Control de ortodoncia" },
    name: "Odontólogos",
    meta: {
      title: "Agenda360 para odontólogos · Agenda y reservas online",
      description:
        "La agenda de tu consultorio dental: reservas online con tu ubicación, recordatorios, una agenda para cada profesional e historia clínica con radiografías.",
    },
    hero: {
      before: "Tu consultorio, con cada cita",
      accent: "en su sitio",
      after: ".",
      text: "Tus pacientes reservan desde tu enlace, reciben su recordatorio y confirman que van. Recepción y cada odontólogo ven sólo lo suyo.",
    },
    intro: {
      before: "De la",
      accent: "reserva",
      after: "a la radiografía.",
      text: "Tu página de reservas con tu ubicación, la agenda de cada profesional y la historia clínica de cada paciente.",
    },
    blocks: [
      {
        label: "Reservas",
        title: "Tu página de reservas, con el mapa",
        description: "Tus pacientes eligen el servicio y una hora libre, a cualquier hora, y ven cómo llegar a tu consultorio.",
        visual: { kind: "booking", service: "Limpieza dental", detail: "40 min · jueves 30" },
      },
      {
        label: "Agendas",
        title: "Una agenda por odontólogo o por sillón",
        description: "Cada agenda con su horario y su color. Tus pacientes eligen con quién al reservar.",
        visual: { kind: "week" },
      },
      {
        label: "Equipo",
        title: "Recepción agenda; cada profesional ve lo suyo",
        description: "Cada persona del equipo entra con su rol: administración, recepción o profesional, y sólo ve lo que le toca.",
        visual: { kind: "team" },
      },
      {
        label: "Historia clínica",
        title: "La historia clínica, con radiografías",
        description: "Antecedentes, evoluciones y archivos como radiografías o PDFs. Ni el soporte de Agenda360 puede abrirla.",
        visual: { kind: "files", title: "Evolución · control", file: "radiografia-panoramica.jpg" },
      },
      {
        label: "Recordatorios",
        title: "Recordatorios y confirmación",
        description: "Antes de cada cita les llega un recordatorio con «Confirmo que voy». Si no pueden, cancelan a tiempo y la hora queda libre.",
        visual: { kind: "reminder" },
      },
      {
        label: "Pagos",
        title: "Cobro por transferencia",
        description: "Tu paciente ve tus datos bancarios y te sube el comprobante desde su celular. Tú marcas la cita como pagada.",
        visual: { kind: "payment" },
      },
    ],
    steps: [
      { title: "Crea tu agenda", text: "Pones los horarios de cada profesional y tus servicios: limpieza, control, ortodoncia…" },
      { title: "Comparte tu enlace", text: "En tu WhatsApp, tu Instagram, tu web o tu perfil de Google. Tus pacientes reservan desde ahí." },
      { title: "Atiende", text: "Recepción ve el día de todos; cada odontólogo, el suyo. Los recordatorios salen solos." },
    ],
    questions: [
      {
        question: "¿Puedo tener una agenda por sillón?",
        answer: "Sí. Cada agenda tiene su horario: puede ser de un odontólogo o de un sillón, y tus pacientes eligen al reservar.",
      },
      {
        question: "¿Mis pacientes tienen que crear una cuenta?",
        answer: "No. Abren tu enlace, eligen la hora y reservan con su documento, su nombre y su email. Nada más.",
      },
      {
        question: "¿Puedo guardar radiografías?",
        answer: "Sí, en la historia clínica de cada paciente: fotos y PDFs. Sólo los ven tú y las personas que autorices.",
      },
      {
        question: "¿Quién puede ver la historia clínica?",
        answer: "Sólo tú y las personas de tu equipo que autorices. Ni el soporte de Agenda360 puede verla, y cada acceso queda registrado.",
      },
      { question: "¿Cuánto cuesta?", answer: PRICE_ANSWER },
    ],
    whatsappMessage: "Hola, soy odontólogo/a y quiero saber más de Agenda360.",
  },
];

export const specialtyBySlug = (slug: string) => SPECIALTIES.find((specialty) => specialty.slug === slug) ?? null;
