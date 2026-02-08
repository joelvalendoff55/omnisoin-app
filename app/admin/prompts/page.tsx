import { MFAGuard } from "@/components/auth/MFAGuard";
import AdminPromptsPage from "@/views/AdminPromptsPage";

export default function Page() {
  return <MFAGuard><AdminPromptsPage /></MFAGuard>;
}
