"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Tooltip,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Euro,
  CreditCard,
  Receipt,
  Clock,
  Users,
  AlertCircle,
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface Invoice {
  id: string;
  patient_name: string;
  patient_id: string;
  practitioner_name: string;
  practitioner_id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  payment_date?: string;
  care_type: string;
  acts: { code: string; label: string; amount: number }[];
}

interface BillingDashboardProps {
  invoices: Invoice[];
  loading?: boolean;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const STATUS_COLORS: Record<string, string> = {
  paid: 'text-green-600 bg-green-100',
  pending: 'text-yellow-600 bg-yellow-100',
  overdue: 'text-red-600 bg-red-100',
  cancelled: 'text-gray-600 bg-gray-100',
};

const STATUS_LABELS: Record<string, string> = {
  paid: 'Payé',
  pending: 'En attente',
  overdue: 'Impayé',
  cancelled: 'Annulé',
};

export function BillingDashboard({ invoices, loading }: BillingDashboardProps) {
  // Calculate KPIs
  const kpis = useMemo(() => {
    const now = new Date();
    const thisMonth = invoices.filter(inv => {
      const invDate = new Date(inv.date);
      return invDate >= startOfMonth(now) && invDate <= endOfMonth(now);
    });
    
    const lastMonth = invoices.filter(inv => {
      const invDate = new Date(inv.date);
      const lm = subMonths(now, 1);
      return invDate >= startOfMonth(lm) && invDate <= endOfMonth(lm);
    });

    const thisMonthRevenue = thisMonth
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + i.amount, 0);
    
    const lastMonthRevenue = lastMonth
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + i.amount, 0);

    const pendingAmount = invoices
      .filter(i => i.status === 'pending' || i.status === 'overdue')
      .reduce((sum, i) => sum + i.amount, 0);

    const overdueCount = invoices.filter(i => i.status === 'overdue').length;
    
    const avgInvoiceAmount = invoices.length > 0 
      ? invoices.reduce((sum, i) => sum + i.amount, 0) / invoices.length 
      : 0;

    const trend = lastMonthRevenue > 0 
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;

    return {
      thisMonthRevenue,
      lastMonthRevenue,
      pendingAmount,
      overdueCount,
      avgInvoiceAmount,
      trend,
      totalInvoices: invoices.length,
      paidInvoices: invoices.filter(i => i.status === 'paid').length,
    };
  }, [invoices]);

  // Monthly revenue chart data
  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; revenue: number; count: number }> = {};
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(now, i);
      const key = format(date, 'yyyy-MM');
      months[key] = {
        month: format(date, 'MMM', { locale: fr }),
        revenue: 0,
        count: 0,
      };
    }

    invoices.forEach(inv => {
      if (inv.status === 'paid') {
        const key = format(new Date(inv.date), 'yyyy-MM');
        if (months[key]) {
          months[key].revenue += inv.amount;
          months[key].count += 1;
        }
      }
    });

    return Object.values(months);
  }, [invoices]);

  // Revenue by practitioner
  const byPractitioner = useMemo(() => {
    const practitioners: Record<string, { name: string; revenue: number; count: number }> = {};
    
    invoices.filter(i => i.status === 'paid').forEach(inv => {
      if (!practitioners[inv.practitioner_id]) {
        practitioners[inv.practitioner_id] = {
          name: inv.practitioner_name,
          revenue: 0,
          count: 0,
        };
      }
      practitioners[inv.practitioner_id].revenue += inv.amount;
      practitioners[inv.practitioner_id].count += 1;
    });

    return Object.values(practitioners).sort((a, b) => b.revenue - a.revenue);
  }, [invoices]);

  // Revenue by care type
  const byCareType = useMemo(() => {
    const types: Record<string, { name: string; value: number }> = {};
    
    invoices.filter(i => i.status === 'paid').forEach(inv => {
      if (!types[inv.care_type]) {
        types[inv.care_type] = { name: inv.care_type, value: 0 };
      }
      types[inv.care_type].value += inv.amount;
    });

    return Object.values(types).sort((a, b) => b.value - a.value);
  }, [invoices]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-32 bg-muted/20" />
          </Card>
        ))}
      </div>
    );
  }

  const chartConfig = {
    revenue: { label: 'CA', color: 'hsl(var(--primary))' },
    count: { label: 'Factures', color: 'hsl(var(--chart-2))' },
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">CA ce mois</p>
                <p className="text-2xl font-bold">{kpis.thisMonthRevenue.toFixed(0)} €</p>
                <div className="flex items-center gap-1 mt-1">
                  {kpis.trend >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm ${kpis.trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {kpis.trend >= 0 ? '+' : ''}{kpis.trend.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Euro className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Encaissements en attente</p>
                <p className="text-2xl font-bold">{kpis.pendingAmount.toFixed(0)} €</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {invoices.filter(i => i.status === 'pending').length} facture(s)
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Impayés</p>
                <p className="text-2xl font-bold text-red-600">{kpis.overdueCount}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  À relancer
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Facture moyenne</p>
                <p className="text-2xl font-bold">{kpis.avgInvoiceAmount.toFixed(0)} €</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {kpis.paidInvoices} payée(s)
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Évolution du CA mensuel</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="revenue" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  name="CA (€)"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Revenue by Care Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition par type de soin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {byCareType.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Aucune donnée
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byCareType}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {byCareType.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(0)} €`, 'Montant']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Practitioner */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            CA par praticien
          </CardTitle>
        </CardHeader>
        <CardContent>
          {byPractitioner.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune donnée
            </p>
          ) : (
            <div className="space-y-3">
              {byPractitioner.slice(0, 5).map((p, index) => {
                const maxRevenue = byPractitioner[0]?.revenue || 1;
                const percentage = (p.revenue / maxRevenue) * 100;
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground">
                        {p.revenue.toFixed(0)} € ({p.count} factures)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all" 
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: COLORS[index % COLORS.length] 
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
