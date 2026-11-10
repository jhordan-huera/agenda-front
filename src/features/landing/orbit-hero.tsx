import { useEffect, useRef, type CSSProperties } from "react";
import { Link } from "react-router";
import { APP_NAME } from "@/lib/constants/app";
import { cn } from "@/lib/utils";
import { DEMO_BOOKING_PATH } from "./landing-constants";
import { useReducedMotion } from "./landing-motion";
import { PRIMARY_BUTTON, riseDelay, SECONDARY_BUTTON, TECH_LABEL, WIDE_HEADING } from "./landing-styles";
import { Accent } from "./landing-ui";
import { ORBIT_CARDS } from "./orbit-cards";
import { SignupLink } from "./signup-link";
import type { SignupContact } from "./use-signup-contact";

/** Los hechos de debajo de los botones: todos ciertos hoy (sin la LOPDP, que sólo va en /privacidad). */
const FACTS = ["Gratis para empezar", "Sin tarjeta", "Tus pacientes no crean cuenta", "Hecho en Ecuador"];

/*
 * El movimiento de la órbita, como el de getartcraft.com (leído con REA): las tarjetas nacen detrás del
 * nombre y viajan hacia el borde por tres brazos en espiral, como una cinta. Todo gira despacio, cada
 * tarjeta flota un poco y bajar la página las adelanta (y subirla las devuelve).
 */
const ARMS = 3;
/** Viajes completos (del centro al borde) por minuto, sin tocar nada. */
const IDLE_PER_MINUTE = 0.57;
/** Viajes que adelanta cada 1.000 px de desplazamiento. */
const SCROLL_PER_1000PX = 0.2;
/** Grados por segundo que gira la órbita entera. */
const SPIN_DEG_PER_SECOND = 1.4;
/** Cuánto se tuerce cada brazo, en radianes, del centro al borde. */
const TWIST = 2.3;
/** El vaivén de cada tarjeta: píxeles y vueltas por segundo. */
const WOBBLE_PX = 6;
const WOBBLE_HZ = 0.25;
/** Las tarjetas que se ven en el celular (las primeras). */
const SMALL_SCREEN_CARDS = 6;
/** La ola de la entrada: segundos que tarda en llegar del centro al borde. */
const INTRO_SECONDS = 2.6;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

/**
 * Las tarjetas en su brazo: el JavaScript sólo mueve `transform` y `opacity` en cada cuadro, sin React. Se
 * detiene fuera de la pantalla y con la pestaña oculta. Con «reducir movimiento», quedan quietas en su sitio.
 */
function OrbitField() {
  const fieldRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const reduced = useReducedMotion();

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const cards = cardsRef.current.filter((card): card is HTMLDivElement => card !== null);
    const count = cards.length;
    let width = field.clientWidth;
    let height = field.clientHeight;
    const resize = new ResizeObserver(() => {
      width = field.clientWidth;
      height = field.clientHeight;
      if (reduced) draw(0, 0, 0, 1);
    });
    resize.observe(field);

    /** Pinta todas las tarjetas: `travel` las adelanta, `spin` gira, `time` mueve el vaivén y `wave` la entrada. */
    function draw(travel: number, spin: number, time: number, wave: number) {
      const small = width < 640;
      // En el celular, la mitad de las tarjetas y más lejos del texto: si no, tapan el nombre y los botones.
      const inner = small ? height * 0.36 : Math.min(width, height) * 0.16;
      const outer = Math.hypot(width, height) * 0.56;
      const stretchX = small ? 1 : Math.min(1.45, width / height);
      cards.forEach((card, index) => {
        const arm = index % ARMS;
        const phase = Math.floor(index / ARMS) / Math.ceil(count / ARMS);
        const progress = (((phase + travel + arm * 0.17) % 1) + 1) % 1;
        const angle = (arm / ARMS) * Math.PI * 2 + spin + progress * TWIST;
        const radius = inner + (outer - inner) * Math.pow(progress, 0.9);
        const wobbleX = Math.sin(time * WOBBLE_HZ * Math.PI * 2 + index * 1.7) * WOBBLE_PX;
        const wobbleY = Math.cos(time * WOBBLE_HZ * Math.PI * 2 + index * 2.3) * WOBBLE_PX;
        const x = Math.cos(angle) * radius * stretchX + wobbleX;
        const y = Math.sin(angle) * radius * 0.82 + wobbleY;
        const scale = (small ? 0.55 : 0.78) + progress * (small ? 0.35 : 0.55);
        const intro = clamp01((wave - progress) / 0.18);
        const shown = !small || index < SMALL_SCREEN_CARDS;
        const opacity = shown ? smooth(0, 0.12, progress) * (1 - smooth(0.84, 1, progress)) * intro : 0;
        card.style.transform = `translate3d(calc(${x}px - 50%), calc(${y}px - 50%), 0) scale(${scale.toFixed(3)})`;
        card.style.opacity = opacity.toFixed(3);
        card.style.zIndex = String(Math.round(progress * 100));
      });
    }

    if (reduced) {
      draw(0, 0, 0, 2);
      return () => resize.disconnect();
    }

    let frame = 0;
    let visible = true;
    let idle = 0;
    let last = performance.now();
    const started = last;
    const tick = (now: number) => {
      const elapsed = Math.min(0.1, (now - last) / 1000);
      last = now;
      idle += (elapsed * IDLE_PER_MINUTE) / 60;
      const seconds = (now - started) / 1000;
      const travel = idle + (window.scrollY * SCROLL_PER_1000PX) / 1000;
      const spin = (seconds * SPIN_DEG_PER_SECOND * Math.PI) / 180;
      draw(travel, spin, seconds, (seconds / INTRO_SECONDS) * 1.2);
      frame = visible && !document.hidden ? requestAnimationFrame(tick) : 0;
    };
    const resume = () => {
      if (frame || !visible || document.hidden) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      resume();
    });
    observer.observe(field);
    document.addEventListener("visibilitychange", resume);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      document.removeEventListener("visibilitychange", resume);
    };
  }, [reduced]);

  return (
    <div
      ref={fieldRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden [mask-image:radial-gradient(ellipse_50%_40%_at_50%_54%,transparent_56%,black_100%)] max-sm:[mask-image:radial-gradient(ellipse_90%_40%_at_50%_52%,transparent_65%,black_100%)]"
    >
      <svg viewBox="-500 -500 1000 1000" className="absolute top-1/2 left-1/2 size-[max(140vw,140vh)] -translate-x-1/2 -translate-y-1/2">
        {[150, 245, 340].map((radius) => (
          <circle key={radius} r={radius} fill="none" stroke="var(--border)" strokeWidth="0.8" />
        ))}
        <circle r={420} fill="none" stroke="var(--border)" strokeWidth="0.6" strokeDasharray="2 10" />
        {/* Tres arcos de la marca que giran, cada uno a su ritmo. */}
        {[
          { r: 245, color: "var(--ink)", dash: "260 1280", duration: "70s", direction: "normal" },
          { r: 340, color: "var(--highlight)", dash: "420 1720", duration: "110s", direction: "reverse" },
          { r: 150, color: "var(--muted-foreground)", dash: "140 800", duration: "55s", direction: "normal" },
        ].map((arc) => (
          <circle
            key={arc.r}
            r={arc.r}
            fill="none"
            stroke={arc.color}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray={arc.dash}
            className="landing-ring"
            style={{ "--ring-duration": arc.duration, "--ring-direction": arc.direction } as CSSProperties}
          />
        ))}
      </svg>
      {ORBIT_CARDS.map((card, index) => (
        <div
          key={index}
          ref={(node) => {
            cardsRef.current[index] = node;
          }}
          className="absolute top-1/2 left-1/2 rounded-xl border border-border bg-card p-3 text-[11px] leading-snug text-card-foreground opacity-0 shadow-lifted will-change-transform"
          style={{ width: card.width }}
        >
          {card.content}
        </div>
      ))}
    </div>
  );
}

/**
 * El encabezado (prueba en dev, 2026-10-27), al estilo de getartcraft.com: el nombre enorme en Archivo
 * ensanchada, que se forma letra a letra; la frase con su palabra en cursiva; los dos botones rectos y los
 * hechos en mayúsculas. Detrás, la órbita con trozos de Agenda360.
 */
export function OrbitHero({ signup }: { signup: SignupContact }) {
  return (
    <section aria-labelledby="titulo-portada" className="relative isolate flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-4 pt-20 pb-16">
      <OrbitField />
      <div className="relative flex max-w-6xl flex-col items-center text-center">
        <p aria-hidden className={cn(WIDE_HEADING, "text-[clamp(2.5rem,10.4vw,9.5rem)] leading-[0.9] tracking-[-0.05em] whitespace-nowrap [font-stretch:125%]")}>
          {Array.from(APP_NAME).map((letter, index) => (
            <span key={index} className="landing-rise inline-block" style={riseDelay(80 + index * 55)}>
              {letter}
            </span>
          ))}
        </p>
        <h1 id="titulo-portada" className={cn(WIDE_HEADING, "landing-rise mt-6 text-[clamp(1.6rem,3.4vw,2.75rem)] leading-tight font-bold [font-stretch:110%]")} style={riseDelay(750)}>
          <span className="sr-only">{APP_NAME}: </span>
          Tu agenda, <Accent>sin vueltas</Accent>.
        </h1>
        <p className="landing-rise mt-4 max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground" style={riseDelay(850)}>
          Agenda y reservas online para profesionales: tus pacientes eligen su hora y tú solo atiendes.
        </p>
        <div className="landing-rise mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row" style={riseDelay(950)}>
          <SignupLink contact={signup} registerLabel="Crear mi agenda gratis" className={PRIMARY_BUTTON} />
          <Link to={DEMO_BOOKING_PATH} className={SECONDARY_BUTTON}>
            Probar una página de reservas
          </Link>
        </div>
        <ul className={cn(TECH_LABEL, "landing-rise mt-8 flex flex-wrap justify-center gap-x-4 gap-y-2 text-muted-foreground")} style={riseDelay(1050)}>
          {FACTS.map((fact, index) => (
            <li key={fact} className="flex items-center gap-4">
              {index > 0 && <span aria-hidden className="size-1 bg-ink" />}
              {fact}
            </li>
          ))}
        </ul>
      </div>
      <p className={cn(TECH_LABEL, "absolute bottom-4 left-5 hidden text-muted-foreground sm:block")}>Ilustración · datos de ejemplo</p>
    </section>
  );
}
