import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileDown, Award, Lock } from 'lucide-react';
import ExportRequestList from '@/components/exports/ExportRequestList';
import { HASCertificationExport } from '@/components/exports/HASCertificationExport';

export default function ExportsPage() {
  return (
    <DashboardLayout>
      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <FileDown className="h-4 w-4" />
            Demandes d'export
          </TabsTrigger>
          <TabsTrigger value="has" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Certification HAS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <ExportRequestList />
        </TabsContent>

        <TabsContent value="has">
          <HASCertificationExport />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
