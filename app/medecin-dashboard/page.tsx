import { MFAGuard } from "@/components/auth/MFAGuard";
import MedecinDashboard from "@/views/MedecinDashboard";

export default function Page() {
  return <MFAGuard><MedecinDashboard /></MFAGuard>;
}
