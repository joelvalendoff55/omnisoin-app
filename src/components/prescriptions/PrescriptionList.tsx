"use client";

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  MoreHorizontal,
  FileDown,
  Printer,
  Trash2,
  Eye,
  Pill,
  Calendar,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Prescription } from '@/lib/prescriptions';
import { usePrescriptions, useSignature } from '@/hooks/usePrescriptions';
import { useStructureId } from '@/hooks/useStructureId';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { downloadPrescriptionPdf, printPrescriptionPdf, PrescriptionPdfData } from '@/lib/prescriptionPdf';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface PrescriptionListProps {
  onViewPrescription?: (prescription: Prescription) => void;
}

const STATUS_CONFIG = {
  draft: { label: 'Brouillon', variant: 'secondary' as const },
  signed: { label: 'Signée', variant: 'default' as const },
  printed: { label: 'Imprimée', variant: 'outline' as const },
  cancelled: { label: 'Annulée', variant: 'destructive' as const },
};

// Hook to fetch structure details
function useStructureDetails(structureId: string | null) {
  return useQuery({
    queryKey: ['structure', structureId],
    queryFn: async () => {
      if (!structureId) return null;
      const { data, error } = await supabase
        .from('structures')
        .select('*')
        .eq('id', structureId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!structureId,
  });
}

export function PrescriptionList({ onViewPrescription }: PrescriptionListProps) {
  const { prescriptions, isLoading, deletePrescription } = usePrescriptions();
  const { structureId } = useStructureId();
  const { data: structure } = useStructureDetails(structureId);
  const { teamMembers } = useTeamMembers();
  const { signatureUrl } = useSignature();

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter((p) => {
      // Search filter
      if (searchQuery) {
        const patientName = `${p.patient?.first_name || ''} ${p.patient?.last_name || ''}`.toLowerCase();
        const query = searchQuery.toLowerCase();
        if (!patientName.includes(query)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }

      // Date filter
      if (dateFilter !== 'all') {
        const createdDate = new Date(p.created_at);
        const now = new Date();
        
        switch (dateFilter) {
          case 'today':
            if (createdDate.toDateString() !== now.toDateString()) return false;
            break;
          case 'week':
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 7);
            if (createdDate < weekAgo) return false;
            break;
          case 'month':
            const monthAgo = new Date(now);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            if (createdDate < monthAgo) return false;
            break;
        }
      }

      return true;
    });
  }, [prescriptions, searchQuery, dateFilter, statusFilter]);

  const handleDownload = async (prescription: Prescription) => {
    const practitioner = teamMembers?.find((tm) => tm.id === prescription.practitioner_id);
    
    const pdfData: PrescriptionPdfData = {
      prescription: {
        ...prescription,
        patient: prescription.patient ? {
          id: prescription.patient.id,
          first_name: prescription.patient.first_name,
          last_name: prescription.patient.last_name,
          dob: prescription.patient.dob,
        } : undefined,
      },
      structure: {
        name: structure?.name || '',
        address: structure?.address,
        phone: structure?.phone,
        email: structure?.email,
      },
      practitioner: {
        first_name: practitioner?.profile?.first_name || null,
        last_name: practitioner?.profile?.last_name || null,
        specialty: practitioner?.specialty,
        rpps_number: practitioner?.professional_id,
        adeli_number: null,
      },
      signatureUrl,
    };
    
    await downloadPrescriptionPdf(pdfData);
  };

  const handlePrint = async (prescription: Prescription) => {
    const practitioner = teamMembers?.find((tm) => tm.id === prescription.practitioner_id);
    
    const pdfData: PrescriptionPdfData = {
      prescription: {
        ...prescription,
        patient: prescription.patient ? {
          id: prescription.patient.id,
          first_name: prescription.patient.first_name,
          last_name: prescription.patient.last_name,
          dob: prescription.patient.dob,
        } : undefined,
      },
      structure: {
        name: structure?.name || '',
        address: structure?.address,
        phone: structure?.phone,
        email: structure?.email,
      },
      practitioner: {
        first_name: practitioner?.profile?.first_name || null,
        last_name: practitioner?.profile?.last_name || null,
        specialty: practitioner?.specialty,
        rpps_number: practitioner?.professional_id,
        adeli_number: null,
      },
      signatureUrl,
    };
    
    await printPrescriptionPdf(pdfData);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5" />
          Ordonnances ({filteredPrescriptions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="week">7 derniers jours</SelectItem>
              <SelectItem value="month">30 derniers jours</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="signed">Signée</SelectItem>
              <SelectItem value="printed">Imprimée</SelectItem>
              <SelectItem value="cancelled">Annulée</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {filteredPrescriptions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Pill className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aucune ordonnance trouvée</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Médicaments</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Options</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrescriptions.map((prescription) => (
                  <TableRow key={prescription.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {prescription.patient?.first_name} {prescription.patient?.last_name}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(prescription.created_at), 'dd MMM yyyy', { locale: fr })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(prescription.created_at), 'HH:mm')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{prescription.medications.length}</span>
                        <span className="text-muted-foreground text-sm">médicament(s)</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_CONFIG[prescription.status].variant}>
                        {STATUS_CONFIG[prescription.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {prescription.is_ald && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            ALD
                          </Badge>
                        )}
                        {prescription.is_renewable && (
                          <Badge variant="outline" className="text-xs">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            x{prescription.renewal_count}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onViewPrescription && (
                            <DropdownMenuItem onClick={() => onViewPrescription(prescription)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Voir
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDownload(prescription)}>
                            <FileDown className="h-4 w-4 mr-2" />
                            Télécharger PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePrint(prescription)}>
                            <Printer className="h-4 w-4 mr-2" />
                            Imprimer
                          </DropdownMenuItem>
                          {prescription.status === 'draft' && (
                            <DropdownMenuItem
                              onClick={() => deletePrescription(prescription.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
