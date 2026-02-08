import { MFAGuard } from "@/components/auth/MFAGuard";
import DocumentsPage from "@/views/DocumentsPage";

export default function Page() {
  return <MFAGuard><DocumentsPage /></MFAGuard>;
}
