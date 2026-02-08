import { MFAGuard } from "@/components/auth/MFAGuard";
import IPAPage from "@/pages/IPAPage";

export default function Page() {
  return <MFAGuard><IPAPage /></MFAGuard>;
}
