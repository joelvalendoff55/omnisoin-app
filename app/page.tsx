import { MFAGuard } from "@/components/auth/MFAGuard";
import Index from "@/views/Index";

export default function HomePage() {
  return (
    <MFAGuard>
      <Index />
    </MFAGuard>
  );
}
