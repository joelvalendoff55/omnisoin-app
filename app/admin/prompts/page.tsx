import { MFAGuard } from "@/components/auth/MFAGuard";
import AdminPromptsPage from "@/pages/AdminPromptsPage";

export default function Page() {
  return <MFAGuard><AdminPromptsPage /></MFAGuard>;
}
