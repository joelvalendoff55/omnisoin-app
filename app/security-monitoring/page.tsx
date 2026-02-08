import { MFAGuard } from "@/components/auth/MFAGuard";
import SecurityMonitoringPage from "@/pages/SecurityMonitoringPage";

export default function Page() {
  return <MFAGuard><SecurityMonitoringPage /></MFAGuard>;
}
