import { Navigate } from 'react-router-dom';

/**
 * Redirect legacy /settings/integrations route to /settings?tab=integrations
 */
export default function SettingsIntegrationsPage() {
  return <Navigate to="/settings?tab=integrations" replace />;
}
