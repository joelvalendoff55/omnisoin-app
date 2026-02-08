import { MFAGuard } from "@/components/auth/MFAGuard";
import EncounterPage from "@/views/EncounterPage";

export default function Page() {
  return <MFAGuard><EncounterPage /></MFAGuard>;
}
