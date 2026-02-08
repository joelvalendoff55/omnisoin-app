import { MFAGuard } from "@/components/auth/MFAGuard";
import CotationPage from "@/pages/CotationPage";

export default function Page() {
  return <MFAGuard><CotationPage /></MFAGuard>;
}
