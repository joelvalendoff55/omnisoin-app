#!/bin/bash
# Generate all Next.js App Router pages from Lovable React Router routes
set -e

echo "Generating Next.js route files..."

# Helper function to create a page file
create_page() {
  local dir="$1"
  local import_path="$2"
  local component="$3"
  local guard="$4"

  mkdir -p "app/$dir"

  if [ "$guard" = "mfa" ]; then
    cat > "app/$dir/page.tsx" << EOF
import { MFAGuard } from "@/components/auth/MFAGuard";
import $component from "@/views/$import_path";

export default function Page() {
  return <MFAGuard><$component /></MFAGuard>;
}
EOF
  elif [ "$guard" = "none" ]; then
    cat > "app/$dir/page.tsx" << EOF
import $component from "@/views/$import_path";

export default function Page() {
  return <$component />;
}
EOF
  fi
  echo "  Created app/$dir/page.tsx"
}

# Auth
create_page "auth" "Auth" "Auth" "none"

# Practitioner routes (MFA guarded)
create_page "assistant-dashboard" "AssistantDashboard" "AssistantDashboard" "mfa"
create_page "patients" "Patients" "Patients" "mfa"
create_page "patients/[id]" "PatientDetailPage" "PatientDetailPage" "mfa"
create_page "team" "TeamPage" "TeamPage" "mfa"
create_page "team/delegations" "DelegationsPage" "DelegationsPage" "mfa"
create_page "queue" "QueuePage" "QueuePage" "mfa"
create_page "tasks" "TasksPage" "TasksPage" "mfa"
create_page "agenda" "AgendaPage" "AgendaPage" "mfa"
create_page "activity" "ActivityPage" "ActivityPage" "mfa"
create_page "inbox" "InboxPage" "InboxPage" "mfa"
create_page "messagerie-patients" "PatientMessagesPage" "PatientMessagesPage" "mfa"
create_page "documents" "DocumentsPage" "DocumentsPage" "mfa"
create_page "transcripts" "TranscriptsPage" "TranscriptsPage" "mfa"
create_page "settings" "Settings" "Settings" "mfa"
create_page "settings/integrations" "SettingsIntegrationsPage" "SettingsIntegrationsPage" "mfa"
create_page "stats" "StatsPage" "StatsPage" "mfa"
create_page "coordination" "CoordinatricePage" "CoordinatricePage" "mfa"
create_page "coordinatrice" "CoordinatricePage" "CoordinatricePage" "mfa"
create_page "ipa" "IPAPage" "IPAPage" "mfa"
create_page "medecin" "MedecinPage" "MedecinPage" "mfa"
create_page "medecin-dashboard" "MedecinDashboard" "MedecinDashboard" "mfa"
create_page "cotation" "CotationPage" "CotationPage" "mfa"
create_page "billing" "BillingPage" "BillingPage" "mfa"
create_page "file-attente" "FileAttentePage" "FileAttentePage" "mfa"
create_page "prompts-admin" "PromptsAdmin" "PromptsAdmin" "mfa"
create_page "admin/prompts" "AdminPromptsPage" "AdminPromptsPage" "mfa"
create_page "admin" "AdminPage" "AdminPage" "mfa"
create_page "gdpr-audit" "GdprAuditPage" "GdprAuditPage" "mfa"
create_page "immutable-audit" "ImmutableAuditPage" "ImmutableAuditPage" "mfa"
create_page "exports" "ExportsPage" "ExportsPage" "mfa"
create_page "compliance" "CompliancePage" "CompliancePage" "mfa"
create_page "security-monitoring" "SecurityMonitoringPage" "SecurityMonitoringPage" "mfa"
create_page "ordonnances" "OrdonnancesPage" "OrdonnancesPage" "mfa"
create_page "exam-planning" "ExamPlanningPage" "ExamPlanningPage" "mfa"
create_page "encounter/[id]" "EncounterPage" "EncounterPage" "mfa"

# Public pages (no guard)
create_page "privacy" "PrivacyPage" "PrivacyPage" "none"
create_page "legal" "LegalPage" "LegalPage" "none"
create_page "legal-aid" "LegalAidPage" "LegalAidPage" "none"
create_page "terms" "TermsPage" "TermsPage" "none"

# Patient Portal pages
mkdir -p app/patient-portal/login
cat > app/patient-portal/login/page.tsx << 'EOF'
import { PatientAuthPage } from "@/views/patient";

export default function Page() {
  return <PatientAuthPage />;
}
EOF
echo "  Created app/patient-portal/login/page.tsx"

mkdir -p app/patient-portal/dashboard
cat > app/patient-portal/dashboard/page.tsx << 'EOF'
import { PatientDashboard } from "@/views/patient";

export default function Page() {
  return <PatientDashboard />;
}
EOF
echo "  Created app/patient-portal/dashboard/page.tsx"

mkdir -p app/patient-portal/appointments
cat > app/patient-portal/appointments/page.tsx << 'EOF'
import { PatientAppointments } from "@/views/patient";

export default function Page() {
  return <PatientAppointments />;
}
EOF
echo "  Created app/patient-portal/appointments/page.tsx"

mkdir -p app/patient-portal/messages
cat > app/patient-portal/messages/page.tsx << 'EOF'
import { PatientMessages } from "@/views/patient";

export default function Page() {
  return <PatientMessages />;
}
EOF
echo "  Created app/patient-portal/messages/page.tsx"

mkdir -p app/patient-portal/documents
cat > app/patient-portal/documents/page.tsx << 'EOF'
import { PatientDocuments } from "@/views/patient";

export default function Page() {
  return <PatientDocuments />;
}
EOF
echo "  Created app/patient-portal/documents/page.tsx"

mkdir -p app/patient-portal/profile
cat > app/patient-portal/profile/page.tsx << 'EOF'
import { PatientProfile } from "@/views/patient";

export default function Page() {
  return <PatientProfile />;
}
EOF
echo "  Created app/patient-portal/profile/page.tsx"

# Super Admin pages
mkdir -p app/super-admin
cat > app/super-admin/page.tsx << 'EOF'
import { SuperAdminDashboard } from "@/views/super-admin";

export default function Page() {
  return <SuperAdminDashboard />;
}
EOF
echo "  Created app/super-admin/page.tsx"

mkdir -p app/super-admin/organizations
cat > app/super-admin/organizations/page.tsx << 'EOF'
import { SuperAdminOrganizations } from "@/views/super-admin";

export default function Page() {
  return <SuperAdminOrganizations />;
}
EOF
echo "  Created app/super-admin/organizations/page.tsx"

mkdir -p app/super-admin/administrators
cat > app/super-admin/administrators/page.tsx << 'EOF'
import { SuperAdminAdministrators } from "@/views/super-admin";

export default function Page() {
  return <SuperAdminAdministrators />;
}
EOF
echo "  Created app/super-admin/administrators/page.tsx"

mkdir -p app/super-admin/teams
cat > app/super-admin/teams/page.tsx << 'EOF'
import { SuperAdminTeams } from "@/views/super-admin";

export default function Page() {
  return <SuperAdminTeams />;
}
EOF
echo "  Created app/super-admin/teams/page.tsx"

mkdir -p app/super-admin/settings
cat > app/super-admin/settings/page.tsx << 'EOF'
import { SuperAdminSettings } from "@/views/super-admin";

export default function Page() {
  return <SuperAdminSettings />;
}
EOF
echo "  Created app/super-admin/settings/page.tsx"

mkdir -p "app/super-admin/structure/[id]"
cat > "app/super-admin/structure/[id]/page.tsx" << 'EOF'
import { MFAGuard } from "@/components/auth/MFAGuard";
import SuperAdminStructureDetailPage from "@/views/SuperAdminStructureDetailPage";

export default function Page() {
  return <MFAGuard><SuperAdminStructureDetailPage /></MFAGuard>;
}
EOF
echo "  Created app/super-admin/structure/[id]/page.tsx"

# Not found page
cat > app/not-found.tsx << 'EOF'
import NotFound from "@/views/NotFound";

export default function NotFoundPage() {
  return <NotFound />;
}
EOF
echo "  Created app/not-found.tsx"

echo ""
echo "All route files generated successfully!"
echo "Total routes created: ~50 pages"
