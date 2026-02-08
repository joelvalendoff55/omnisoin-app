import { MFAGuard } from "@/components/auth/MFAGuard";
import CompliancePage from "@/views/CompliancePage";

export default function Page() {
  return <MFAGuard><CompliancePage /></MFAGuard>;
}
