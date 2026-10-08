import { useEffect, useState } from "react";

/**
 * Sólo en desarrollo: si la API local está conectada a la base de PRODUCCIÓN (`npm run dev:prod` en
 * el backend), un aviso fijo recuerda que lo que se hace aquí es real.
 */
export function ProductionDbBanner() {
  const [production, setProduction] = useState(false);
  useEffect(() => {
    fetch("/api/health")
      .then((response) => response.json())
      .then((health: { productionDatabase?: boolean }) => setProduction(health.productionDatabase === true))
      .catch(() => undefined);
  }, []);
  if (!production) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed top-2 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-destructive px-4 py-1.5 text-xs font-semibold text-white shadow-lg"
    >
      Base de PRODUCCIÓN: lo que hagas aquí es real
    </div>
  );
}
