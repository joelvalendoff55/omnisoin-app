import { MFAGuard } from "@/components/auth/MFAGuard";
import TasksPage from "@/pages/TasksPage";

export default function Page() {
  return <MFAGuard><TasksPage /></MFAGuard>;
}
