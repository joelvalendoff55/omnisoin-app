import { MFAGuard } from "@/components/auth/MFAGuard";
import QueuePage from "@/pages/QueuePage";

export default function Page() {
  return <MFAGuard><QueuePage /></MFAGuard>;
}
