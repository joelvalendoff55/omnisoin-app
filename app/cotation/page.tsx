import { MFAGuard } from "@/components/auth/MFAGuard";
import CotationPage from "@/views/CotationPage";

export default function Page() {
  return <MFAGuard><CotationPage /></MFAGuard>;
}
