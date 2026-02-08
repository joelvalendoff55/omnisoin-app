import { MFAGuard } from "@/components/auth/MFAGuard";
import PatientDetailPage from "@/pages/PatientDetailPage";

export default function Page() {
  return <MFAGuard><PatientDetailPage /></MFAGuard>;
}
