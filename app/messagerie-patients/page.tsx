import { MFAGuard } from "@/components/auth/MFAGuard";
import PatientMessagesPage from "@/pages/PatientMessagesPage";

export default function Page() {
  return <MFAGuard><PatientMessagesPage /></MFAGuard>;
}
