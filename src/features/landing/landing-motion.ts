import { useEffect, useState, useSyncExternalStore } from "react";

/*
 * El movimiento de la portada editorial (prueba en dev, 2026-10-27): lo que aparece al llegar, las
 * ilustraciones que sólo corren mientras se ven y la sección en la que se está. Un observador compartido
 * por tipo, sin bibliotecas; con «reducir movimiento», el CSS (landing.css) deja todo en su sitio final.
 */

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeMotion(onChange: () => void) {
  const query = matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** ¿Pide el aparato menos movimiento? Sigue el cambio con la página abierta. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeMotion, () => matchMedia(REDUCED_MOTION).matches, () => false);
}

let revealObserver: IntersectionObserver | null = null;
let playObserver: IntersectionObserver | null = null;

/**
 * Para `ref` de lo que lleva `data-reveal`: le pone `data-revealed` una vez, cuando su borde de arriba
 * entra en el 85 % de la pantalla. Sin IntersectionObserver, aparece ya.
 */
export function revealRef(node: HTMLElement | null) {
  if (!node) return;
  if (typeof IntersectionObserver === "undefined") {
    node.setAttribute("data-revealed", "");
    return;
  }
  revealObserver ??= new IntersectionObserver(
    (entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute("data-revealed", "");
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -15% 0px" },
  );
  const observer = revealObserver;
  observer.observe(node);
  return () => observer.unobserve(node);
}

/** Para `ref` de una casilla con ilustración: `data-playing` mientras se ve (al menos una quinta parte). */
export function playRef(node: HTMLElement | null) {
  if (!node || typeof IntersectionObserver === "undefined") return;
  playObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) entry.target.toggleAttribute("data-playing", entry.isIntersecting);
    },
    { threshold: 0.2 },
  );
  const observer = playObserver;
  observer.observe(node);
  return () => observer.unobserve(node);
}

/** Las dos a la vez: aparece al llegar y su ilustración corre mientras se ve. */
export function revealAndPlayRef(node: HTMLElement | null) {
  const stopReveal = revealRef(node);
  const stopPlay = playRef(node);
  return () => {
    stopReveal?.();
    stopPlay?.();
  };
}

/**
 * La sección en la que se está: la que cruza la franja del medio de la pantalla. null: ninguna (el
 * encabezado). La usan el menú de arriba y la regla de la derecha.
 */
export function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const visible = new Set<string>();
    const order = key.split(",");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        setActive(order.find((id) => visible.has(id)) ?? null);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const id of order) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [key]);
  return active;
}
