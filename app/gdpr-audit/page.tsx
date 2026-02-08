import { MFAGuard } from "@/components/auth/MFAGuard";
import GdprAuditPage from "@/pages/GdprAuditPage";

export default function Page() {
  return <MFAGuard><GdprAuditPage /></MFAGuard>;
}
