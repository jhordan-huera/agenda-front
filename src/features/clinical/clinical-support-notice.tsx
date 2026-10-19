import { ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { CLINICAL_SUPPORT_BLOCKED_MESSAGE } from "@/lib/constants/business";

/** En modo soporte, en lugar de la historia clínica (spec 025): el soporte no la ve. */
export function ClinicalSupportNotice() {
  return (
    <EmptyState
      icon={ShieldCheck}
      title={CLINICAL_SUPPORT_BLOCKED_MESSAGE}
      description="Sólo la ven el propietario y las personas que él autoriza."
    />
  );
}
