import { MFAGuard } from "@/components/auth/MFAGuard";
import GdprAuditPage from "@/views/GdprAuditPage";

export default function Page() {
  return <MFAGuard><GdprAuditPage /></MFAGuard>;
}
