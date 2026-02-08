import { MFAGuard } from "@/components/auth/MFAGuard";
import ActivityPage from "@/views/ActivityPage";

export default function Page() {
  return <MFAGuard><ActivityPage /></MFAGuard>;
}
