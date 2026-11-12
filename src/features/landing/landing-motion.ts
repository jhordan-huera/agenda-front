import { useEffect, useState } from "react";

/*
 * La portada «Panel de marca» (spec 043) no anima sus secciones al bajar: el único movimiento es la aparición de la
 * agenda de la semana al cargar (landing.css). Aquí queda sólo la sección en la que se está, para la barra.
 */

/**
 * La sección en la que se está: la que cruza la franja del medio de la pantalla. null: ninguna (el encabezado).
 * La usa la barra de arriba para marcar su enlace.
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
