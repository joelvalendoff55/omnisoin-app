import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Filter,
  Calendar as CalendarIcon,
  MoreHorizontal,
  Eye,
  Download,
  Send,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  SortAsc,
  SortDesc,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Invoice } from './BillingDashboard';

interface InvoiceListProps {
  invoices: Invoice[];
  onViewInvoice: (invoice: Invoice) => void;
  onDownloadInvoice: (invoice: Invoice) => void;
  onSendReminder: (invoice: Invoice) => void;
  onMarkAsPaid: (invoice: Invoice) => void;
  onCancelInvoice: (invoice: Invoice) => void;
}

type StatusFilter = 'all' | 'paid' | 'pending' | 'overdue' | 'cancelled';
type SortField = 'date' | 'amount' | 'patient' | 'status';
type SortDirection = 'asc' | 'desc';

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  paid: { label: 'Payé', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  pending: { label: 'En attente', icon: Clock, color: 'text-yellow-600 bg-yellow-100' },
  overdue: { label: 'Impayé', icon: AlertTriangle, color: 'text-red-600 bg-red-100' },
  cancelled: { label: 'Annulé', icon: XCircle, color: 'text-gray-600 bg-gray-100' },
};

const ITEMS_PER_PAGE = 10;

export function InvoiceList({
  invoices,
  onViewInvoice,
  onDownloadInvoice,
  onSendReminder,
  onMarkAsPaid,
  onCancelInvoice,
}: InvoiceListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [amountRange, setAmountRange] = useState<{ min?: number; max?: number }>({});
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);

  // Filter and sort invoices
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(inv =>
        inv.patient_name.toLowerCase().includes(query) ||
        inv.id.toLowerCase().includes(query) ||
        inv.practitioner_name.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(inv => inv.status === statusFilter);
    }

    // Date range filter
    if (dateRange.from) {
      result = result.filter(inv => new Date(inv.date) >= dateRange.from!);
    }
    if (dateRange.to) {
      result = result.filter(inv => new Date(inv.date) <= dateRange.to!);
    }

    // Amount range filter
    if (amountRange.min !== undefined) {
      result = result.filter(inv => inv.amount >= amountRange.min!);
    }
    if (amountRange.max !== undefined) {
      result = result.filter(inv => inv.amount <= amountRange.max!);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'patient':
          comparison = a.patient_name.localeCompare(b.patient_name);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [invoices, searchQuery, statusFilter, dateRange, amountRange, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.length === paginatedInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(paginatedInvoices.map(inv => inv.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedInvoices(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateRange({});
    setAmountRange({});
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || dateRange.from || dateRange.to || amountRange.min !== undefined || amountRange.max !== undefined;

  const SortIcon = sortDirection === 'asc' ? SortAsc : SortDesc;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Liste des factures</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {filteredInvoices.length} facture(s)
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par patient, n° facture..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>

          {/* Status filter */}
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as StatusFilter);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="paid">Payé</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="overdue">Impayé</SelectItem>
              <SelectItem value="cancelled">Annulé</SelectItem>
            </SelectContent>
          </Select>

          {/* Date range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    `${format(dateRange.from, 'dd/MM')} - ${format(dateRange.to, 'dd/MM')}`
                  ) : (
                    format(dateRange.from, 'dd/MM/yyyy')
                  )
                ) : (
                  'Période'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  setDateRange({ from: range?.from, to: range?.to });
                  setCurrentPage(1);
                }}
                locale={fr}
              />
            </PopoverContent>
          </Popover>

          {/* Amount range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Montant
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
              <div className="space-y-3">
                <p className="text-sm font-medium">Filtrer par montant</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Min (€)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={amountRange.min ?? ''}
                      onChange={(e) => {
                        setAmountRange(prev => ({
                          ...prev,
                          min: e.target.value ? Number(e.target.value) : undefined,
                        }));
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Max (€)</label>
                    <Input
                      type="number"
                      placeholder="1000"
                      value={amountRange.max ?? ''}
                      onChange={(e) => {
                        setAmountRange(prev => ({
                          ...prev,
                          max: e.target.value ? Number(e.target.value) : undefined,
                        }));
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
              <X className="h-4 w-4" />
              Effacer
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedInvoices.length === paginatedInvoices.length && paginatedInvoices.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Date
                    {sortField === 'date' && <SortIcon className="h-4 w-4" />}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort('patient')}
                >
                  <div className="flex items-center gap-1">
                    Patient
                    {sortField === 'patient' && <SortIcon className="h-4 w-4" />}
                  </div>
                </TableHead>
                <TableHead>Praticien</TableHead>
                <TableHead>Type</TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground text-right"
                  onClick={() => toggleSort('amount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Montant
                    {sortField === 'amount' && <SortIcon className="h-4 w-4" />}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Statut
                    {sortField === 'status' && <SortIcon className="h-4 w-4" />}
                  </div>
                </TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Aucune facture trouvée
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInvoices.map((invoice) => {
                  const statusConfig = STATUS_CONFIG[invoice.status];
                  const StatusIcon = statusConfig.icon;
                  return (
                    <TableRow key={invoice.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Checkbox
                          checked={selectedInvoices.includes(invoice.id)}
                          onCheckedChange={() => toggleSelect(invoice.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(invoice.date), 'dd/MM/yyyy', { locale: fr })}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          #{invoice.id.slice(0, 8)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{invoice.patient_name}</TableCell>
                      <TableCell className="text-muted-foreground">{invoice.practitioner_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{invoice.care_type}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {invoice.amount.toFixed(2)} €
                      </TableCell>
                      <TableCell>
                        <Badge className={`gap-1 ${statusConfig.color}`} variant="outline">
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onViewInvoice(invoice)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Voir détails
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDownloadInvoice(invoice)}>
                              <Download className="h-4 w-4 mr-2" />
                              Télécharger PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                              <>
                                <DropdownMenuItem onClick={() => onMarkAsPaid(invoice)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Marquer payé
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onSendReminder(invoice)}>
                                  <Send className="h-4 w-4 mr-2" />
                                  Envoyer relance
                                </DropdownMenuItem>
                              </>
                            )}
                            {invoice.status !== 'cancelled' && (
                              <DropdownMenuItem 
                                onClick={() => onCancelInvoice(invoice)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Annuler
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} sur {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
