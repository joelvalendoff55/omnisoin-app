import { MFAGuard } from "@/components/auth/MFAGuard";
import DocumentsPage from "@/pages/DocumentsPage";

export default function Page() {
  return <MFAGuard><DocumentsPage /></MFAGuard>;
}
