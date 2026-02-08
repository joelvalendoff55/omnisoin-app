import { MFAGuard } from "@/components/auth/MFAGuard";
import FileAttentePage from "@/pages/FileAttentePage";

export default function Page() {
  return <MFAGuard><FileAttentePage /></MFAGuard>;
}
