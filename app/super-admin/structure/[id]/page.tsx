import { MFAGuard } from "@/components/auth/MFAGuard";
import SuperAdminStructureDetailPage from "@/views/SuperAdminStructureDetailPage";

export default function Page() {
  return <MFAGuard><SuperAdminStructureDetailPage /></MFAGuard>;
}
