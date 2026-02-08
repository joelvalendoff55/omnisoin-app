import { MFAGuard } from "@/components/auth/MFAGuard";
import CoordinatricePage from "@/pages/CoordinatricePage";

export default function Page() {
  return <MFAGuard><CoordinatricePage /></MFAGuard>;
}
