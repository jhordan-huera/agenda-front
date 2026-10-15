import { NoticesPageContent } from "@/features/notices/notices-page-content";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";

/** /dashboard/notices: los avisos de la campana de los últimos 30 días (spec 014). */
export default function NoticesPage() {
  const { data: business } = useCurrentBusiness();
  return <NoticesPageContent scope="business" timezone={business?.timezone ?? DEFAULT_TIMEZONE} />;
}
