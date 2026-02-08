import { MFAGuard } from "@/components/auth/MFAGuard";
import StatsPage from "@/views/StatsPage";

export default function Page() {
  return <MFAGuard><StatsPage /></MFAGuard>;
}
