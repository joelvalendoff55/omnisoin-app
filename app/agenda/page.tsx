import { MFAGuard } from "@/components/auth/MFAGuard";
import AgendaPage from "@/views/AgendaPage";

export default function Page() {
  return <MFAGuard><AgendaPage /></MFAGuard>;
}
