import { useEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { TRACKED_SECTIONS } from "./landing-constants";
import { TECH_LABEL } from "./landing-styles";

const TICKS = Array.from({ length: 101 }, (_, index) => index);
const DIGITS = Array.from({ length: 10 }, (_, digit) => digit);

/**
 * La regla de la derecha (prueba en dev, 2026-10-27), como la de getartcraft.com: rayas del 0 al 100, una
 * aguja de la marca que baja con el desplazamiento, el porcentaje con cifras que ruedan como un contador y,
 * abajo, el nombre de la sección en vertical. Sólo en pantallas anchas (desde 1440 px), en el margen que
 * deja el marco. Decorativa: el menú de arriba ya dice dónde se está.
 *
 * El desplazamiento no pasa por React: cada cuadro mueve la aguja y las cifras directamente.
 */
export function ScrollRail({ active }: { active: string | null }) {
  const needleRef = useRef<HTMLDivElement>(null);
  const digitsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const label = TRACKED_SECTIONS.find((section) => section.id === active)?.label ?? "Inicio";

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const percent = Math.round(Math.min(1, Math.max(0, window.scrollY / max)) * 100);
      if (needleRef.current) needleRef.current.style.top = `${percent}%`;
      String(percent)
        .padStart(3, "0")
        .split("")
        .forEach((digit, index) => {
          const column = digitsRef.current[index];
          if (column) column.style.transform = `translateY(-${digit}em)`;
        });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed top-12 right-0 bottom-0 z-30 hidden w-16 min-[1440px]:block print:hidden">
      <div className="absolute top-6 right-0 bottom-36 left-0">
        {TICKS.map((tick) => {
          const major = tick % 5 === 0;
          return (
            <span
              key={tick}
              className={cn("landing-tick absolute right-0 h-px bg-border", major ? "w-5 bg-muted-foreground/60" : "w-2.5")}
              style={{ top: `${tick}%`, "--tick-delay": `${300 + tick * 8}ms` } as CSSProperties}
            >
              {tick % 10 === 0 && tick > 0 && tick < 100 && (
                <span className={cn(TECH_LABEL, "absolute top-1/2 right-7 -translate-y-1/2 text-[0.5625rem] tracking-[0.1em] text-muted-foreground")}>{tick}</span>
              )}
            </span>
          );
        })}
        <div ref={needleRef} className="absolute right-0 left-0 h-px bg-ink transition-[top] duration-100 ease-linear motion-reduce:transition-none">
          <span className={cn(TECH_LABEL, "absolute top-1.5 right-1 flex text-[0.625rem] tracking-[0.06em] text-ink")}>
            {[0, 1, 2].map((column) => (
              <span key={column} className="inline-block h-[1em] overflow-hidden leading-none">
                <span
                  ref={(node) => {
                    digitsRef.current[column] = node;
                  }}
                  className="landing-digit-col flex flex-col"
                >
                  {DIGITS.map((digit) => (
                    <span key={digit} className="h-[1em] leading-none">
                      {digit}
                    </span>
                  ))}
                </span>
              </span>
            ))}
            <span className="ml-0.5 leading-none">%</span>
          </span>
        </div>
      </div>
      {/* El giro va en el párrafo y la entrada en el texto: si fueran juntos, la animación desharía el giro. */}
      <p className="absolute bottom-8 left-3 rotate-180 font-wide text-sm font-extrabold tracking-[0.04em] text-muted-foreground uppercase [font-stretch:118%] [writing-mode:vertical-rl]">
        <span key={label} className="landing-rise inline-block">
          {label}
        </span>
      </p>
    </div>
  );
}
