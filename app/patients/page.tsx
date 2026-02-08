import { MFAGuard } from "@/components/auth/MFAGuard";
import Patients from "@/views/Patients";

export default function Page() {
  return <MFAGuard><Patients /></MFAGuard>;
}
