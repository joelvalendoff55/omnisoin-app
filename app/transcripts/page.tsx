import { MFAGuard } from "@/components/auth/MFAGuard";
import TranscriptsPage from "@/pages/TranscriptsPage";

export default function Page() {
  return <MFAGuard><TranscriptsPage /></MFAGuard>;
}
