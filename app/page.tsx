import { MFAGuard } from "@/components/auth/MFAGuard";
import Index from "@/pages/Index";

export default function HomePage() {
  return (
    <MFAGuard>
      <Index />
    </MFAGuard>
  );
}
