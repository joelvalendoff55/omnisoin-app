import { MFAGuard } from "@/components/auth/MFAGuard";
import Settings from "@/pages/Settings";

export default function Page() {
  return <MFAGuard><Settings /></MFAGuard>;
}
