import { MFAGuard } from "@/components/auth/MFAGuard";
import AssistantDashboard from "@/views/AssistantDashboard";

export default function Page() {
  return <MFAGuard><AssistantDashboard /></MFAGuard>;
}
