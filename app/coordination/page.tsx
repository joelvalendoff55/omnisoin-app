import { MFAGuard } from "@/components/auth/MFAGuard";
import CoordinatricePage from "@/views/CoordinatricePage";

export default function Page() {
  return <MFAGuard><CoordinatricePage /></MFAGuard>;
}
