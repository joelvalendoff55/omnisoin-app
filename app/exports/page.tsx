import { MFAGuard } from "@/components/auth/MFAGuard";
import ExportsPage from "@/pages/ExportsPage";

export default function Page() {
  return <MFAGuard><ExportsPage /></MFAGuard>;
}
