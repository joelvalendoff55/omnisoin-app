import { MFAGuard } from "@/components/auth/MFAGuard";
import MedecinDashboard from "@/pages/MedecinDashboard";

export default function Page() {
  return <MFAGuard><MedecinDashboard /></MFAGuard>;
}
