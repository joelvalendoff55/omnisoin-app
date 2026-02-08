import { MFAGuard } from "@/components/auth/MFAGuard";
import ImmutableAuditPage from "@/views/ImmutableAuditPage";

export default function Page() {
  return <MFAGuard><ImmutableAuditPage /></MFAGuard>;
}
