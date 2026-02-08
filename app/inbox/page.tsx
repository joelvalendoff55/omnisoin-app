import { MFAGuard } from "@/components/auth/MFAGuard";
import InboxPage from "@/views/InboxPage";

export default function Page() {
  return <MFAGuard><InboxPage /></MFAGuard>;
}
