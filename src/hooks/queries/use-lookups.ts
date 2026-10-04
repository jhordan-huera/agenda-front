import { useMemo } from "react";
import type { Client, Service } from "@/types";
import { useClients } from "./use-clients";
import { useServices } from "./use-services";

/** Mapas id → entidad para mostrar nombres de cliente/servicio junto a las citas. */
export function useLookups() {
  const clients = useClients();
  const services = useServices();

  const clientsById = useMemo(
    () => new Map<string, Client>((clients.data ?? []).map((client) => [client.id, client])),
    [clients.data],
  );
  const servicesById = useMemo(
    () => new Map<string, Service>((services.data ?? []).map((service) => [service.id, service])),
    [services.data],
  );

  return {
    clients: clients.data ?? [],
    services: services.data ?? [],
    clientsById,
    servicesById,
    isPending: clients.isPending || services.isPending,
    isError: clients.isError || services.isError,
    refetch: () => Promise.all([clients.refetch(), services.refetch()]),
  };
}
