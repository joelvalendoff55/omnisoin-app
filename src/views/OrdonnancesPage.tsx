"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Pill } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PrescriptionList, PrescriptionFormDialog } from '@/components/prescriptions';

export default function OrdonnancesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Pill className="h-6 w-6 text-primary" />
              Ordonnances
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez et créez vos prescriptions médicales
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle ordonnance
          </Button>
        </div>

        {/* Prescription List */}
        <PrescriptionList />

        {/* Create Dialog */}
        <PrescriptionFormDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      </div>
    </DashboardLayout>
  );
}
