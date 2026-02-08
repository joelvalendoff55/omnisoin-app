import { MFAGuard } from "@/components/auth/MFAGuard";
import MedecinPage from "@/views/MedecinPage";

export default function Page() {
  return <MFAGuard><MedecinPage /></MFAGuard>;
}
