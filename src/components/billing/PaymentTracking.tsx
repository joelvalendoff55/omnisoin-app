import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Euro,
  CheckCircle,
  Clock,
  AlertTriangle,
  Send,
  Bell,
  TrendingUp,
  Calendar,
  Mail,
  Phone,
  MessageSquare,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import type { Invoice } from './BillingDashboard';

interface PaymentTrackingProps {
  invoices: Invoice[];
  onSendReminder: (invoiceIds: string[], method: 'email' | 'sms') => Promise<void>;
  onMarkAsPaid: (invoiceId: string) => Promise<void>;
}

interface ReminderSettings {
  autoReminders: boolean;
  firstReminderDays: number;
  secondReminderDays: number;
  thirdReminderDays: number;
  reminderMethod: 'email' | 'sms' | 'both';
}

export function PaymentTracking({
  invoices,
  onSendReminder,
  onMarkAsPaid,
}: PaymentTrackingProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>({
    autoReminders: true,
    firstReminderDays: 7,
    secondReminderDays: 14,
    thirdReminderDays: 30,
    reminderMethod: 'email',
  });
  const [sendingReminders, setSendingReminders] = useState(false);

  // Calculate stats
  const stats = useMemo(() => {
    const paid = invoices.filter(i => i.status === 'paid');
    const pending = invoices.filter(i => i.status === 'pending');
    const overdue = invoices.filter(i => i.status === 'overdue');

    const totalRevenue = paid.reduce((sum, i) => sum + i.amount, 0);
    const pendingAmount = pending.reduce((sum, i) => sum + i.amount, 0);
    const overdueAmount = overdue.reduce((sum, i) => sum + i.amount, 0);
    const totalExpected = totalRevenue + pendingAmount + overdueAmount;

    const collectionRate = totalExpected > 0 ? (totalRevenue / totalExpected) * 100 : 0;

    return {
      totalRevenue,
      pendingAmount,
      overdueAmount,
      collectionRate,
      paidCount: paid.length,
      pendingCount: pending.length,
      overdueCount: overdue.length,
    };
  }, [invoices]);

  // Group overdue invoices by urgency
  const overdueByUrgency = useMemo(() => {
    const overdue = invoices.filter(i => i.status === 'overdue');
    const now = new Date();

    return {
      critical: overdue.filter(i => differenceInDays(now, new Date(i.date)) > 60),
      high: overdue.filter(i => {
        const days = differenceInDays(now, new Date(i.date));
        return days > 30 && days <= 60;
      }),
      medium: overdue.filter(i => {
        const days = differenceInDays(now, new Date(i.date));
        return days > 14 && days <= 30;
      }),
      low: overdue.filter(i => differenceInDays(now, new Date(i.date)) <= 14),
    };
  }, [invoices]);

  // Recent payments
  const recentPayments = useMemo(() => {
    return invoices
      .filter(i => i.status === 'paid' && i.payment_date)
      .sort((a, b) => new Date(b.payment_date!).getTime() - new Date(a.payment_date!).getTime())
      .slice(0, 10);
  }, [invoices]);

  const handleBulkReminder = async (invoiceIds: string[], method: 'email' | 'sms') => {
    setSendingReminders(true);
    try {
      await onSendReminder(invoiceIds, method);
      toast.success(`${invoiceIds.length} relance(s) envoyée(s) avec succès`);
    } catch (error) {
      toast.error("Erreur lors de l'envoi des relances");
    } finally {
      setSendingReminders(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Euro className="h-5 w-5" />
          Suivi des paiements
        </CardTitle>
        <CardDescription>
          Encaissements, impayés et relances automatiques
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="overdue" className="relative">
              Impayés
              {stats.overdueCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {stats.overdueCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="payments">Encaissements</TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Encaissé</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.totalRevenue.toFixed(0)} €</p>
                  <p className="text-xs text-muted-foreground">{stats.paidCount} facture(s)</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-yellow-600 mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">En attente</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.pendingAmount.toFixed(0)} €</p>
                  <p className="text-xs text-muted-foreground">{stats.pendingCount} facture(s)</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-red-600 mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Impayés</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.overdueAmount.toFixed(0)} €</p>
                  <p className="text-xs text-muted-foreground">{stats.overdueCount} facture(s)</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">Taux recouvrement</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.collectionRate.toFixed(1)}%</p>
                  <Progress value={stats.collectionRate} className="mt-2" />
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            {stats.overdueCount > 0 && (
              <Card className="border-red-200 bg-red-50/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium">{stats.overdueCount} facture(s) impayée(s)</p>
                        <p className="text-sm text-muted-foreground">
                          Total: {stats.overdueAmount.toFixed(2)} €
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => handleBulkReminder(
                          invoices.filter(i => i.status === 'overdue').map(i => i.id),
                          'email'
                        )}
                        disabled={sendingReminders}
                      >
                        <Mail className="h-4 w-4" />
                        Relancer par email
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => handleBulkReminder(
                          invoices.filter(i => i.status === 'overdue').map(i => i.id),
                          'sms'
                        )}
                        disabled={sendingReminders}
                      >
                        <MessageSquare className="h-4 w-4" />
                        Relancer par SMS
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Overdue Tab */}
          <TabsContent value="overdue" className="space-y-4 mt-4">
            {stats.overdueCount === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p>Aucune facture impayée</p>
              </div>
            ) : (
              <>
                {/* Critical Overdue */}
                {overdueByUrgency.critical.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-red-600 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Critique (+ de 60 jours) - {overdueByUrgency.critical.length}
                    </h3>
                    <ScrollArea className="max-h-[200px]">
                      <div className="space-y-2">
                        {overdueByUrgency.critical.map((inv) => (
                          <InvoiceRow
                            key={inv.id}
                            invoice={inv}
                            onSendReminder={onSendReminder}
                            onMarkAsPaid={onMarkAsPaid}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* High Priority */}
                {overdueByUrgency.high.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-orange-600 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Priorité haute (30-60 jours) - {overdueByUrgency.high.length}
                    </h3>
                    <ScrollArea className="max-h-[200px]">
                      <div className="space-y-2">
                        {overdueByUrgency.high.map((inv) => (
                          <InvoiceRow
                            key={inv.id}
                            invoice={inv}
                            onSendReminder={onSendReminder}
                            onMarkAsPaid={onMarkAsPaid}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Medium & Low Priority */}
                {(overdueByUrgency.medium.length > 0 || overdueByUrgency.low.length > 0) && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-yellow-600 flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      À surveiller ({overdueByUrgency.medium.length + overdueByUrgency.low.length})
                    </h3>
                    <ScrollArea className="max-h-[200px]">
                      <div className="space-y-2">
                        {[...overdueByUrgency.medium, ...overdueByUrgency.low].map((inv) => (
                          <InvoiceRow
                            key={inv.id}
                            invoice={inv}
                            onSendReminder={onSendReminder}
                            onMarkAsPaid={onMarkAsPaid}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4 mt-4">
            <h3 className="text-sm font-medium">Derniers encaissements</h3>
            {recentPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Euro className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aucun encaissement récent</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {recentPayments.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-green-50/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">{inv.patient_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Payé le {format(new Date(inv.payment_date!), 'dd/MM/yyyy', { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-green-600">
                        +{inv.amount.toFixed(2)} €
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Relances automatiques</Label>
                  <p className="text-sm text-muted-foreground">
                    Envoyer des rappels automatiques pour les factures impayées
                  </p>
                </div>
                <Switch
                  checked={reminderSettings.autoReminders}
                  onCheckedChange={(checked) =>
                    setReminderSettings((prev) => ({ ...prev, autoReminders: checked }))
                  }
                />
              </div>

              {reminderSettings.autoReminders && (
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>1ère relance</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Après</span>
                        <input
                          type="number"
                          className="w-16 h-8 rounded border px-2 text-center"
                          value={reminderSettings.firstReminderDays}
                          onChange={(e) =>
                            setReminderSettings((prev) => ({
                              ...prev,
                              firstReminderDays: parseInt(e.target.value) || 7,
                            }))
                          }
                        />
                        <span className="text-sm">jours</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>2ème relance</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Après</span>
                        <input
                          type="number"
                          className="w-16 h-8 rounded border px-2 text-center"
                          value={reminderSettings.secondReminderDays}
                          onChange={(e) =>
                            setReminderSettings((prev) => ({
                              ...prev,
                              secondReminderDays: parseInt(e.target.value) || 14,
                            }))
                          }
                        />
                        <span className="text-sm">jours</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>3ème relance</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Après</span>
                        <input
                          type="number"
                          className="w-16 h-8 rounded border px-2 text-center"
                          value={reminderSettings.thirdReminderDays}
                          onChange={(e) =>
                            setReminderSettings((prev) => ({
                              ...prev,
                              thirdReminderDays: parseInt(e.target.value) || 30,
                            }))
                          }
                        />
                        <span className="text-sm">jours</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Méthode de relance</Label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="reminderMethod"
                          checked={reminderSettings.reminderMethod === 'email'}
                          onChange={() =>
                            setReminderSettings((prev) => ({ ...prev, reminderMethod: 'email' }))
                          }
                        />
                        <Mail className="h-4 w-4" />
                        Email
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="reminderMethod"
                          checked={reminderSettings.reminderMethod === 'sms'}
                          onChange={() =>
                            setReminderSettings((prev) => ({ ...prev, reminderMethod: 'sms' }))
                          }
                        />
                        <MessageSquare className="h-4 w-4" />
                        SMS
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="reminderMethod"
                          checked={reminderSettings.reminderMethod === 'both'}
                          onChange={() =>
                            setReminderSettings((prev) => ({ ...prev, reminderMethod: 'both' }))
                          }
                        />
                        Les deux
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button variant="outline" className="gap-2" onClick={() => toast.success('Paramètres sauvegardés')}>
              <Settings className="h-4 w-4" />
              Sauvegarder les paramètres
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Inline component for invoice row in overdue list
function InvoiceRow({
  invoice,
  onSendReminder,
  onMarkAsPaid,
}: {
  invoice: Invoice;
  onSendReminder: (ids: string[], method: 'email' | 'sms') => Promise<void>;
  onMarkAsPaid: (id: string) => Promise<void>;
}) {
  const daysOverdue = differenceInDays(new Date(), new Date(invoice.date));

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
      <div className="flex items-center gap-3">
        <div>
          <p className="font-medium">{invoice.patient_name}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(invoice.date), 'dd/MM/yyyy', { locale: fr })} • {daysOverdue} jours
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-bold text-red-600">{invoice.amount.toFixed(2)} €</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onSendReminder([invoice.id], 'email')}
        >
          <Send className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600">
              <CheckCircle className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Marquer comme payé ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action marquera la facture de {invoice.patient_name} ({invoice.amount.toFixed(2)} €) comme payée.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={() => onMarkAsPaid(invoice.id)}>
                Confirmer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
