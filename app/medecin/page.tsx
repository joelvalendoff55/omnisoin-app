import { MFAGuard } from "@/components/auth/MFAGuard";
import MedecinPage from "@/pages/MedecinPage";

export default function Page() {
  return <MFAGuard><MedecinPage /></MFAGuard>;
}
