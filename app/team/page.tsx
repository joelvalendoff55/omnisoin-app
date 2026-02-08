import { MFAGuard } from "@/components/auth/MFAGuard";
import TeamPage from "@/views/TeamPage";

export default function Page() {
  return <MFAGuard><TeamPage /></MFAGuard>;
}
