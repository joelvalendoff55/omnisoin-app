import MedicalSourcesSection from './integrations/MedicalSourcesSection';
import N8nSection from './integrations/N8nSection';
import GoogleWorkspaceSection from './integrations/GoogleWorkspaceSection';
import ThreeCXSection from './integrations/ThreeCXSection';
import FutureIntegrationsSection from './integrations/FutureIntegrationsSection';

export default function IntegrationsTab() {
  return (
    <div className="space-y-6">
      <GoogleWorkspaceSection />
      <ThreeCXSection />
      <MedicalSourcesSection />
      <N8nSection />
      <FutureIntegrationsSection />
    </div>
  );
}
