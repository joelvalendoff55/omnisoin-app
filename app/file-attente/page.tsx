import { MFAGuard } from "@/components/auth/MFAGuard";
import FileAttentePage from "@/views/FileAttentePage";

export default function Page() {
  return <MFAGuard><FileAttentePage /></MFAGuard>;
}
