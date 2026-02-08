import { MFAGuard } from "@/components/auth/MFAGuard";
import PatientMessagesPage from "@/views/PatientMessagesPage";

export default function Page() {
  return <MFAGuard><PatientMessagesPage /></MFAGuard>;
}
