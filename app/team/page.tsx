import { MFAGuard } from "@/components/auth/MFAGuard";
import TeamPage from "@/pages/TeamPage";

export default function Page() {
  return <MFAGuard><TeamPage /></MFAGuard>;
}
