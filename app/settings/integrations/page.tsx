import { MFAGuard } from "@/components/auth/MFAGuard";
import SettingsIntegrationsPage from "@/pages/SettingsIntegrationsPage";

export default function Page() {
  return <MFAGuard><SettingsIntegrationsPage /></MFAGuard>;
}
