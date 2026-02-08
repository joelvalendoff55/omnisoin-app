import { MFAGuard } from "@/components/auth/MFAGuard";
import ExamPlanningPage from "@/pages/ExamPlanningPage";

export default function Page() {
  return <MFAGuard><ExamPlanningPage /></MFAGuard>;
}
