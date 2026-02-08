import { MFAGuard } from "@/components/auth/MFAGuard";
import OrdonnancesPage from "@/views/OrdonnancesPage";

export default function Page() {
  return <MFAGuard><OrdonnancesPage /></MFAGuard>;
}
