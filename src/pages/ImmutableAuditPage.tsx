import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ImmutableLogViewer from '@/components/audit/ImmutableLogViewer';

export default function ImmutableAuditPage() {
  return (
    <DashboardLayout>
      <ImmutableLogViewer />
    </DashboardLayout>
  );
}
