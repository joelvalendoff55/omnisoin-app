import { MFAGuard } from "@/components/auth/MFAGuard";
import IPAPage from "@/views/IPAPage";

export default function Page() {
  return <MFAGuard><IPAPage /></MFAGuard>;
}
