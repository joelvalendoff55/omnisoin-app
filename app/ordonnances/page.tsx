import { MFAGuard } from "@/components/auth/MFAGuard";
import OrdonnancesPage from "@/pages/OrdonnancesPage";

export default function Page() {
  return <MFAGuard><OrdonnancesPage /></MFAGuard>;
}
