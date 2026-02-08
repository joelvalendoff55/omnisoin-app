import { MFAGuard } from "@/components/auth/MFAGuard";
import QueuePage from "@/views/QueuePage";

export default function Page() {
  return <MFAGuard><QueuePage /></MFAGuard>;
}
