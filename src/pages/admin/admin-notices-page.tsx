import { NoticesPageContent } from "@/features/notices/notices-page-content";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";

/** /admin/notices: los avisos del super admin de los últimos 30 días (spec 014). */
export default function AdminNoticesPage() {
  return <NoticesPageContent scope="platform" timezone={DEFAULT_TIMEZONE} />;
}
