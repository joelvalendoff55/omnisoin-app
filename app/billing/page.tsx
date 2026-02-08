import { MFAGuard } from "@/components/auth/MFAGuard";
import BillingPage from "@/pages/BillingPage";

export default function Page() {
  return <MFAGuard><BillingPage /></MFAGuard>;
}
