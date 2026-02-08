import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { 
  Download, Users, UserPlus, UserCheck, Archive, 
  FileSpreadsheet, Upload, ChevronDown, FileText 
} from 'lucide-react';
import { Patient } from '@/types/patient';
import { toast } from 'sonner';
import { format, subMonths, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EnhancedPatientStatsExportProps {
  patients: Patient[];
  filteredPatients: Patient[];
  practitioners: { user_id: string; first_name: string | null; last_name: string | null }[];
  onImportClick: () => void;
}

export function EnhancedPatientStatsExport({
  patients,
  filteredPatients,
  practitioners,
  onImportClick,
}: EnhancedPatientStatsExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  // Calculate stats
  const stats = useMemo(() => {
    const oneMonthAgo = subMonths(new Date(), 1);
    const newThisMonth = patients.filter(p => isAfter(new Date(p.created_at), oneMonthAgo));

    return {
      total: patients.length,
      newThisMonth: newThisMonth.length,
      active: patients.filter(p => !p.is_archived && p.primary_practitioner_user_id).length,
      archived: patients.filter(p => p.is_archived).length,
    };
  }, [patients]);

  // Pie chart data for practitioner distribution
  const pieData = useMemo(() => {
    const distribution: Record<string, number> = {};
    
    patients.forEach(p => {
      if (p.is_archived) return;
      const practitionerId = p.primary_practitioner_user_id || 'unassigned';
      distribution[practitionerId] = (distribution[practitionerId] || 0) + 1;
    });

    return Object.entries(distribution).map(([id, count]) => {
      if (id === 'unassigned') {
        return { name: 'Non assignés', value: count, fill: 'hsl(var(--muted-foreground))' };
      }
      const practitioner = practitioners.find(p => p.user_id === id);
      const name = practitioner 
        ? `${practitioner.first_name || ''} ${practitioner.last_name || ''}`.trim() || 'Inconnu'
        : 'Inconnu';
      return { name, value: count };
    });
  }, [patients, practitioners]);

  // Colors for pie chart
  const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--accent))',
    'hsl(var(--success))',
    'hsl(var(--warning))',
    'hsl(var(--destructive))',
    'hsl(187, 65%, 55%)',
    'hsl(200, 75%, 60%)',
  ];

  // Export CSV
  const handleExportCSV = (exportAll: boolean = false) => {
    setIsExporting(true);
    try {
      const patientsToExport = exportAll ? patients : filteredPatients;
      const headers = [
        'Nom',
        'Prénom',
        'Date de naissance',
        'Sexe',
        'Téléphone',
        'Email',
        'Praticien référent',
        'Archivé',
        'Note administrative',
        'Créé le',
      ];

      const rows = patientsToExport.map(p => {
        const practitioner = practitioners.find(pr => pr.user_id === p.primary_practitioner_user_id);
        const practitionerName = practitioner 
          ? `${practitioner.first_name || ''} ${practitioner.last_name || ''}`.trim()
          : '';
        
        return [
          p.last_name,
          p.first_name,
          p.dob || '',
          p.sex || '',
          p.phone || '',
          p.email || '',
          practitionerName,
          p.is_archived ? 'Oui' : 'Non',
          p.note_admin || '',
          format(new Date(p.created_at), 'dd/MM/yyyy', { locale: fr }),
        ];
      });

      const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `patients_${exportAll ? 'complet' : 'filtre'}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();

      toast.success(`${patientsToExport.length} patients exportés`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Erreur lors de l'export");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mini dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-none shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total patients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-success/5 to-success/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <UserPlus className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.newThisMonth}</p>
                <p className="text-xs text-muted-foreground">Nouveaux ce mois</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-accent/5 to-accent/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <UserCheck className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Actifs assignés</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-muted/50 to-muted/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Archive className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.archived}</p>
                <p className="text-xs text-muted-foreground">Archivés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Practitioner distribution chart + import/export */}
      <div className="flex flex-col lg:flex-row gap-4">
        {pieData.length > 1 && (
          <Card className="flex-1 min-w-[280px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Répartition par praticien</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.fill || COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend 
                      layout="vertical" 
                      align="right" 
                      verticalAlign="middle"
                      formatter={(value) => <span className="text-xs">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import/Export buttons */}
        <Card className="flex-shrink-0 lg:w-[240px]">
          <CardContent className="p-4 flex flex-col justify-center h-full gap-3">
            <p className="text-sm text-muted-foreground text-center">
              {filteredPatients.length} patient{filteredPatients.length > 1 ? 's' : ''} dans la sélection
            </p>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  disabled={isExporting || patients.length === 0}
                  className="gap-2 w-full"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Exporter CSV
                  <ChevronDown className="h-4 w-4 ml-auto" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExportCSV(false)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Exporter la sélection ({filteredPatients.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCSV(true)}>
                  <Download className="h-4 w-4 mr-2" />
                  Exporter tous les patients ({patients.length})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              variant="outline"
              onClick={onImportClick}
              className="gap-2 w-full"
            >
              <Upload className="h-4 w-4" />
              Importer CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
