"use client";

import { useState, useMemo } from 'react';
import { useRouter } from "next/navigation";
import { useAuth } from '@/hooks/useAuth';
import { useStructureId } from '@/hooks/useStructureId';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SensitivePageBanner } from '@/components/shared/LegalBanner';
import { DraftBadge } from '@/components/shared/DraftBadge';
import {
  BillingDashboard,
  InvoiceList,
  QuickInvoiceForm,
  PaymentTracking,
  AccountingExport,
  type Invoice,
} from '@/components/billing';
import {
  LayoutDashboard,
  FileText,
  Plus,
  Euro,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { subDays, subMonths } from 'date-fns';

// Mock data for demonstration
const generateMockInvoices = (): Invoice[] => {
  const patients = ['Marie Dupont', 'Jean Martin', 'Sophie Bernard', 'Pierre Durand', 'Camille Leroy'];
  const practitioners = [
    { id: '1', name: 'Dr. Martin' },
    { id: '2', name: 'Dr. Dubois' },
  ];
  const careTypes = ['Consultation', 'Suivi', 'Urgence', 'Téléconsultation', 'Acte technique'];
  const statuses: Invoice['status'][] = ['paid', 'pending', 'overdue', 'cancelled'];

  return Array.from({ length: 50 }, (_, i) => {
    const status = statuses[Math.floor(Math.random() * (i < 30 ? 2 : 4))];
    const date = subDays(new Date(), Math.floor(Math.random() * 90));
    return {
      id: `INV-${String(i + 1).padStart(5, '0')}`,
      patient_name: patients[Math.floor(Math.random() * patients.length)],
      patient_id: `pat-${i}`,
      practitioner_name: practitioners[Math.floor(Math.random() * practitioners.length)].name,
      practitioner_id: practitioners[Math.floor(Math.random() * practitioners.length)].id,
      date: date.toISOString(),
      amount: Math.round((Math.random() * 150 + 25) * 100) / 100,
      status,
      payment_date: status === 'paid' ? subDays(date, -Math.floor(Math.random() * 7)).toISOString() : undefined,
      care_type: careTypes[Math.floor(Math.random() * careTypes.length)],
      acts: [{ code: 'G', label: 'Consultation', amount: 30 }],
    };
  });
};

const MOCK_PATIENTS = [
  { id: '1', name: 'Marie Dupont', email: 'marie@example.com', phone: '0612345678' },
  { id: '2', name: 'Jean Martin', email: 'jean@example.com' },
  { id: '3', name: 'Sophie Bernard', email: 'sophie@example.com' },
  { id: '4', name: 'Pierre Durand', phone: '0698765432' },
  { id: '5', name: 'Camille Leroy', email: 'camille@example.com' },
];

const MOCK_ACTES = [
  { code: 'G', label: 'Consultation généraliste', type: 'NGAP' as const, tarif: 30 },
  { code: 'TCG', label: 'Téléconsultation', type: 'NGAP' as const, tarif: 25 },
  { code: 'V', label: 'Visite à domicile', type: 'NGAP' as const, tarif: 26.5 },
  { code: 'DEQP003', label: 'ECG 12 dérivations', type: 'CCAM' as const, tarif: 14.26 },
  { code: 'QZFA008', label: 'Suture simple', type: 'CCAM' as const, tarif: 39.48 },
];

const MOCK_PRACTITIONERS = [
  { id: '1', name: 'Dr. Martin' },
  { id: '2', name: 'Dr. Dubois' },
];

export default function BillingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { structureId } = useStructureId();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [invoices, setInvoices] = useState<Invoice[]>(generateMockInvoices);

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleViewInvoice = (invoice: Invoice) => {
    toast.info(`Affichage de la facture ${invoice.id}`);
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    toast.success(`Téléchargement de la facture ${invoice.id}`);
  };

  const handleSendReminder = async (invoiceIds: string[], method: 'email' | 'sms') => {
    await new Promise(r => setTimeout(r, 500));
    toast.success(`${invoiceIds.length} relance(s) envoyée(s) par ${method}`);
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    setInvoices(prev => prev.map(inv =>
      inv.id === invoiceId ? { ...inv, status: 'paid' as const, payment_date: new Date().toISOString() } : inv
    ));
    toast.success('Facture marquée comme payée');
  };

  const handleCancelInvoice = (invoice: Invoice) => {
    setInvoices(prev => prev.map(inv =>
      inv.id === invoice.id ? { ...inv, status: 'cancelled' as const } : inv
    ));
    toast.success('Facture annulée');
  };

  const handleCreateInvoice = async (data: {
    patientId: string;
    practitionerId: string;
    items: { acteCode: string; quantity: number; unitPrice: number }[];
    notes?: string;
    sendEmail?: boolean;
  }) => {
    await new Promise(r => setTimeout(r, 500));
    const patient = MOCK_PATIENTS.find(p => p.id === data.patientId);
    const practitioner = MOCK_PRACTITIONERS.find(p => p.id === data.practitionerId);
    const total = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const newInvoice: Invoice = {
      id: `INV-${String(invoices.length + 1).padStart(5, '0')}`,
      patient_name: patient?.name || 'Patient',
      patient_id: data.patientId,
      practitioner_name: practitioner?.name || 'Praticien',
      practitioner_id: data.practitionerId,
      date: new Date().toISOString(),
      amount: total,
      status: 'pending',
      care_type: 'Consultation',
      acts: data.items.map(item => {
        const acte = MOCK_ACTES.find(a => a.code === item.acteCode);
        return { code: item.acteCode, label: acte?.label || '', amount: item.unitPrice };
      }),
    };

    setInvoices(prev => [newInvoice, ...prev]);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <SensitivePageBanner />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Euro className="h-7 w-7" />
                Facturation
              </h1>
              <DraftBadge status="draft" />
            </div>
            <p className="text-muted-foreground">
              Gestion des factures, paiements et exports comptables
            </p>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Factures</span>
            </TabsTrigger>
            <TabsTrigger value="new" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nouvelle</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <Euro className="h-4 w-4" />
              <span className="hidden sm:inline">Paiements</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <BillingDashboard invoices={invoices} />
          </TabsContent>

          <TabsContent value="invoices" className="mt-6">
            <InvoiceList
              invoices={invoices}
              onViewInvoice={handleViewInvoice}
              onDownloadInvoice={handleDownloadInvoice}
              onSendReminder={async (inv) => { await handleSendReminder([inv.id], 'email'); }}
              onMarkAsPaid={async (inv) => { await handleMarkAsPaid(inv.id); }}
              onCancelInvoice={handleCancelInvoice}
            />
          </TabsContent>

          <TabsContent value="new" className="mt-6">
            <QuickInvoiceForm
              patients={MOCK_PATIENTS}
              actes={MOCK_ACTES}
              practitioners={MOCK_PRACTITIONERS}
              onCreateInvoice={handleCreateInvoice}
            />
          </TabsContent>

          <TabsContent value="payments" className="mt-6">
            <PaymentTracking
              invoices={invoices}
              onSendReminder={handleSendReminder}
              onMarkAsPaid={(invoiceId) => handleMarkAsPaid(invoiceId)}
            />
          </TabsContent>

          <TabsContent value="export" className="mt-6">
            <AccountingExport
              invoices={invoices}
              structureInfo={{
                name: 'Cabinet Médical OmniSoin',
                address: '123 Rue de la Santé, 75001 Paris',
                siret: '123 456 789 00012',
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
