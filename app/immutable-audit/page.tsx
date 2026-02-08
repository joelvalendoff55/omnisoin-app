import { MFAGuard } from "@/components/auth/MFAGuard";
import ImmutableAuditPage from "@/pages/ImmutableAuditPage";

export default function Page() {
  return <MFAGuard><ImmutableAuditPage /></MFAGuard>;
}
