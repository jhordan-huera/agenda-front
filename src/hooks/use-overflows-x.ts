import { useEffect, useState, type RefObject } from "react";

/**
 * Si el contenido de la caja se sale a lo ancho (un tablero en el celular): sólo entonces la caja entra en
 * el orden del teclado, para deslizarla con las flechas. En el computador cabe y no es una parada más. Lo
 * usan el tablero de la portada (spec 032) y el de la Agenda (spec 034).
 */
export function useOverflowsX(ref: RefObject<HTMLElement | null>) {
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setOverflows(element.scrollWidth > element.clientWidth + 1);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    // También cuando cambia lo de dentro (la columna plegada se abre) sin cambiar el tamaño de la caja.
    for (const child of element.children) observer.observe(child);
    return () => observer.disconnect();
  }, [ref]);
  return overflows;
}
