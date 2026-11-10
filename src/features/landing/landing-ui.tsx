import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { revealRef } from "./landing-motion";
import { revealDelay, TECH_LABEL, WIDE_HEADING } from "./landing-styles";

/*
 * Las piezas de la portada editorial (prueba en dev, 2026-10-27): las barras «01 / FUNCIONES», la entrada de
 * cada sección y la palabra en cursiva de los títulos.
 */

/** Una palabra del título en cursiva serif, en el color de la marca: «Tu agenda, *sin vueltas*.» */
export function Accent({ children }: { children: ReactNode }) {
  return <em className="font-accent text-[1.12em] font-normal tracking-normal text-ink italic [font-stretch:100%]">{children}</em>;
}

/**
 * La barra de cada sección: «01 / FUNCIONES» a la izquierda y una nota a la derecha. Al llegar, la línea
 * de la marca se dibuja sobre ella de izquierda a derecha.
 */
export function SectionBar({ index, title, note }: { index: string; title: string; note?: string }) {
  return (
    <div ref={revealRef} className="relative flex h-11 items-center justify-between gap-4 border-b border-border px-5 sm:px-8">
      <span aria-hidden data-draw className="absolute inset-x-0 -top-px h-px bg-ink" />
      <p className={cn(TECH_LABEL, "text-muted-foreground")}>
        {index} / <span className="text-foreground">{title}</span>
      </p>
      {note && <p className={cn(TECH_LABEL, "hidden text-right text-muted-foreground sm:block")}>{note}</p>}
    </div>
  );
}

/** La entrada de cada sección: el título grande y su párrafo, que aparecen al llegar. */
export function SectionIntro({ id, title, children }: { id: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="border-b border-border px-5 py-16 sm:px-10 sm:py-24">
      <h2 id={id} data-reveal ref={revealRef} className={cn(WIDE_HEADING, "max-w-4xl text-[clamp(2.25rem,5.4vw,4.5rem)] leading-[0.98]")}>
        {title}
      </h2>
      {children && (
        <p data-reveal ref={revealRef} style={revealDelay(120)} className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {children}
        </p>
      )}
    </div>
  );
}
