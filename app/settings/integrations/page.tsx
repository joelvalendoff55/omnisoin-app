import { MFAGuard } from "@/components/auth/MFAGuard";
import SettingsIntegrationsPage from "@/views/SettingsIntegrationsPage";

export default function Page() {
  return <MFAGuard><SettingsIntegrationsPage /></MFAGuard>;
}
