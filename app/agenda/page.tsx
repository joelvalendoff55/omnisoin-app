import { MFAGuard } from "@/components/auth/MFAGuard";
import AgendaPage from "@/pages/AgendaPage";

export default function Page() {
  return <MFAGuard><AgendaPage /></MFAGuard>;
}
