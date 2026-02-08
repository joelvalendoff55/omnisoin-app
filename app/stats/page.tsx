import { MFAGuard } from "@/components/auth/MFAGuard";
import StatsPage from "@/pages/StatsPage";

export default function Page() {
  return <MFAGuard><StatsPage /></MFAGuard>;
}
