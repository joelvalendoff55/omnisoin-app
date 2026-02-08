import { MFAGuard } from "@/components/auth/MFAGuard";
import TranscriptsPage from "@/views/TranscriptsPage";

export default function Page() {
  return <MFAGuard><TranscriptsPage /></MFAGuard>;
}
