import { MFAGuard } from "@/components/auth/MFAGuard";
import PatientDetailPage from "@/views/PatientDetailPage";

export default function Page() {
  return <MFAGuard><PatientDetailPage /></MFAGuard>;
}
