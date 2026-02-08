import { MFAGuard } from "@/components/auth/MFAGuard";
import AssistantDashboard from "@/pages/AssistantDashboard";

export default function Page() {
  return <MFAGuard><AssistantDashboard /></MFAGuard>;
}
