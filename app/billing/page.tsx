import { MFAGuard } from "@/components/auth/MFAGuard";
import BillingPage from "@/views/BillingPage";

export default function Page() {
  return <MFAGuard><BillingPage /></MFAGuard>;
}
