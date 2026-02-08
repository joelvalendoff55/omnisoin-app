import { MFAGuard } from "@/components/auth/MFAGuard";
import CompliancePage from "@/pages/CompliancePage";

export default function Page() {
  return <MFAGuard><CompliancePage /></MFAGuard>;
}
