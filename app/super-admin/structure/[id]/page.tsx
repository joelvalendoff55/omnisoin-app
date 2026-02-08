import { MFAGuard } from "@/components/auth/MFAGuard";
import SuperAdminStructureDetailPage from "@/pages/SuperAdminStructureDetailPage";

export default function Page() {
  return <MFAGuard><SuperAdminStructureDetailPage /></MFAGuard>;
}
