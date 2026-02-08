import { MFAGuard } from "@/components/auth/MFAGuard";
import Settings from "@/views/Settings";

export default function Page() {
  return <MFAGuard><Settings /></MFAGuard>;
}
