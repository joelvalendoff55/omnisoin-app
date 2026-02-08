import { MFAGuard } from "@/components/auth/MFAGuard";
import Patients from "@/pages/Patients";

export default function Page() {
  return <MFAGuard><Patients /></MFAGuard>;
}
