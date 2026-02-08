import { MFAGuard } from "@/components/auth/MFAGuard";
import AdminPage from "@/views/AdminPage";

export default function Page() {
  return <MFAGuard><AdminPage /></MFAGuard>;
}
