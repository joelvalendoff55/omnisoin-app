import { MFAGuard } from "@/components/auth/MFAGuard";
import DelegationsPage from "@/pages/DelegationsPage";

export default function Page() {
  return <MFAGuard><DelegationsPage /></MFAGuard>;
}
