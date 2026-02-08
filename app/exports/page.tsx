import { MFAGuard } from "@/components/auth/MFAGuard";
import ExportsPage from "@/views/ExportsPage";

export default function Page() {
  return <MFAGuard><ExportsPage /></MFAGuard>;
}
