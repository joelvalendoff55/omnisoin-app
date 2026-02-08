import { MFAGuard } from "@/components/auth/MFAGuard";
import ActivityPage from "@/pages/ActivityPage";

export default function Page() {
  return <MFAGuard><ActivityPage /></MFAGuard>;
}
