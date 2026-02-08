import { MFAGuard } from "@/components/auth/MFAGuard";
import TasksPage from "@/views/TasksPage";

export default function Page() {
  return <MFAGuard><TasksPage /></MFAGuard>;
}
