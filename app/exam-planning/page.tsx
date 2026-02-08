import { MFAGuard } from "@/components/auth/MFAGuard";
import ExamPlanningPage from "@/views/ExamPlanningPage";

export default function Page() {
  return <MFAGuard><ExamPlanningPage /></MFAGuard>;
}
