import { MFAGuard } from "@/components/auth/MFAGuard";
import PromptsAdmin from "@/pages/PromptsAdmin";

export default function Page() {
  return <MFAGuard><PromptsAdmin /></MFAGuard>;
}
