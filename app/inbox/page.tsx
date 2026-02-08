import { MFAGuard } from "@/components/auth/MFAGuard";
import InboxPage from "@/pages/InboxPage";

export default function Page() {
  return <MFAGuard><InboxPage /></MFAGuard>;
}
