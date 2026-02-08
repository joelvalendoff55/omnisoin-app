import { MFAGuard } from "@/components/auth/MFAGuard";
import PromptsAdmin from "@/views/PromptsAdmin";

export default function Page() {
  return <MFAGuard><PromptsAdmin /></MFAGuard>;
}
