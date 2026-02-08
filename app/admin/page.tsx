import { MFAGuard } from "@/components/auth/MFAGuard";
import AdminPage from "@/pages/AdminPage";

export default function Page() {
  return <MFAGuard><AdminPage /></MFAGuard>;
}
