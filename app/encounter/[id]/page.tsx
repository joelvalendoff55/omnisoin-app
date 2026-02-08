import { MFAGuard } from "@/components/auth/MFAGuard";
import EncounterPage from "@/pages/EncounterPage";

export default function Page() {
  return <MFAGuard><EncounterPage /></MFAGuard>;
}
