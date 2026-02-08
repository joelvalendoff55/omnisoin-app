import { MFAGuard } from "@/components/auth/MFAGuard";
import SecurityMonitoringPage from "@/views/SecurityMonitoringPage";

export default function Page() {
  return <MFAGuard><SecurityMonitoringPage /></MFAGuard>;
}
