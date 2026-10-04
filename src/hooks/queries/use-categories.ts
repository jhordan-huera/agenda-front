import { useQuery } from "@tanstack/react-query";
import { data } from "@/lib/data";
import type { BusinessCategoryInfo } from "@/types";
import { queryKeys } from "./query-keys";

/**
 * Categorías de negocio (de la base de datos). `active` son las que se pueden elegir;
 * `label` y `find` resuelven también las desactivadas que conserva algún negocio.
 */
export function useCategories() {
  const query = useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => data.platform.listCategories(),
    staleTime: 5 * 60_000,
  });
  const all: BusinessCategoryInfo[] = query.data ?? [];
  const find = (id: string) => all.find((category) => category.id === id);
  return {
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
    categories: all,
    active: all.filter((category) => category.isActive),
    find,
    label: (id: string) => find(id)?.name ?? "",
  };
}
