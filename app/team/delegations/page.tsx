import { MFAGuard } from "@/components/auth/MFAGuard";
import DelegationsPage from "@/views/DelegationsPage";

export default function Page() {
  return <MFAGuard><DelegationsPage /></MFAGuard>;
}
