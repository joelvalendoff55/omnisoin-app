import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
import {
  Plus,
  Trash2,
  Search,
  User,
  Receipt,
  ChevronsUpDown,
  Check,
  FileText,
  Euro,
  Send,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';

interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Acte {
  code: string;
  label: string;
  type: 'NGAP' | 'CCAM';
  tarif: number;
}

interface QuickInvoiceFormProps {
  patients: Patient[];
  actes: Acte[];
  practitioners: { id: string; name: string }[];
  onCreateInvoice: (invoice: {
    patientId: string;
    practitionerId: string;
    items: { acteCode: string; quantity: number; unitPrice: number }[];
    notes?: string;
    sendEmail?: boolean;
  }) => Promise<void>;
}

interface InvoiceItem {
  id: string;
  acte: Acte;
  quantity: number;
  unitPrice: number;
}

export function QuickInvoiceForm({
  patients,
  actes,
  practitioners,
  onCreateInvoice,
}: QuickInvoiceFormProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedPractitioner, setSelectedPractitioner] = useState<string>('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [notes, setNotes] = useState('');
  const [patientOpen, setPatientOpen] = useState(false);
  const [acteOpen, setActeOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [acteSearch, setActeSearch] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter patients
  const filteredPatients = useMemo(() => {
    if (!patientSearch) return patients.slice(0, 10);
    const search = patientSearch.toLowerCase();
    return patients
      .filter(p => p.name.toLowerCase().includes(search))
      .slice(0, 10);
  }, [patients, patientSearch]);

  // Filter actes
  const filteredActes = useMemo(() => {
    if (!acteSearch) return actes.slice(0, 20);
    const search = acteSearch.toLowerCase();
    return actes
      .filter(a => 
        a.code.toLowerCase().includes(search) ||
        a.label.toLowerCase().includes(search)
      )
      .slice(0, 20);
  }, [actes, acteSearch]);

  // Calculate total
  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }, [items]);

  const addActe = (acte: Acte) => {
    const existing = items.find(item => item.acte.code === acte.code);
    if (existing) {
      setItems(items.map(item =>
        item.acte.code === acte.code
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setItems([...items, {
        id: crypto.randomUUID(),
        acte,
        quantity: 1,
        unitPrice: acte.tarif,
      }]);
    }
    setActeOpen(false);
    setActeSearch('');
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setItems(items.map(item =>
      item.id === id ? { ...item, quantity } : item
    ));
  };

  const updatePrice = (id: string, price: number) => {
    if (price < 0) return;
    setItems(items.map(item =>
      item.id === id ? { ...item, unitPrice: price } : item
    ));
  };

  const handleSubmit = async (asDraft = false) => {
    if (!selectedPatient) {
      toast.error('Veuillez sélectionner un patient');
      return;
    }
    if (!selectedPractitioner) {
      toast.error('Veuillez sélectionner un praticien');
      return;
    }
    if (items.length === 0) {
      toast.error('Veuillez ajouter au moins un acte');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateInvoice({
        patientId: selectedPatient.id,
        practitionerId: selectedPractitioner,
        items: items.map(item => ({
          acteCode: item.acte.code,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        notes: notes || undefined,
        sendEmail: !asDraft && sendEmail,
      });

      toast.success(asDraft ? 'Brouillon enregistré' : 'Facture créée avec succès');
      
      // Reset form
      setSelectedPatient(null);
      setSelectedPractitioner('');
      setItems([]);
      setNotes('');
      setSendEmail(false);
    } catch (error) {
      toast.error('Erreur lors de la création de la facture');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Nouvelle facture
        </CardTitle>
        <CardDescription>
          Créez rapidement une facture avec auto-complétion
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Patient Selection */}
        <div className="space-y-2">
          <Label>Patient *</Label>
          <Popover open={patientOpen} onOpenChange={setPatientOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={patientOpen}
                className="w-full justify-between"
              >
                {selectedPatient ? (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {selectedPatient.name}
                  </div>
                ) : (
                  <span className="text-muted-foreground">Rechercher un patient...</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput 
                  placeholder="Rechercher par nom..."
                  value={patientSearch}
                  onValueChange={setPatientSearch}
                />
                <CommandList>
                  <CommandEmpty>Aucun patient trouvé</CommandEmpty>
                  <CommandGroup>
                    {filteredPatients.map((patient) => (
                      <CommandItem
                        key={patient.id}
                        value={patient.id}
                        onSelect={() => {
                          setSelectedPatient(patient);
                          setPatientOpen(false);
                          setPatientSearch('');
                        }}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            selectedPatient?.id === patient.id ? 'opacity-100' : 'opacity-0'
                          }`}
                        />
                        <div>
                          <p className="font-medium">{patient.name}</p>
                          {patient.email && (
                            <p className="text-xs text-muted-foreground">{patient.email}</p>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Practitioner Selection */}
        <div className="space-y-2">
          <Label>Praticien *</Label>
          <Select value={selectedPractitioner} onValueChange={setSelectedPractitioner}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un praticien" />
            </SelectTrigger>
            <SelectContent>
              {practitioners.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Actes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Actes et prestations</Label>
            <Popover open={acteOpen} onOpenChange={setActeOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Ajouter un acte
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="end">
                <Command>
                  <CommandInput
                    placeholder="Rechercher par code ou libellé..."
                    value={acteSearch}
                    onValueChange={setActeSearch}
                  />
                  <CommandList>
                    <CommandEmpty>Aucun acte trouvé</CommandEmpty>
                    <CommandGroup>
                      {filteredActes.map((acte) => (
                        <CommandItem
                          key={acte.code}
                          value={acte.code}
                          onSelect={() => addActe(acte)}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <Badge variant={acte.type === 'CCAM' ? 'default' : 'secondary'} className="text-xs">
                              {acte.type}
                            </Badge>
                            <code className="text-xs font-mono">{acte.code}</code>
                            <span className="text-sm truncate flex-1">{acte.label}</span>
                            <span className="text-sm font-medium">{acte.tarif.toFixed(2)} €</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-lg">
              <Receipt className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Aucun acte ajouté
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={item.acte.type === 'CCAM' ? 'default' : 'secondary'} className="text-xs">
                          {item.acte.type}
                        </Badge>
                        <code className="text-xs font-mono font-semibold">{item.acte.code}</code>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{item.acte.label}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16">
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="h-8 text-center"
                        />
                      </div>
                      <span className="text-muted-foreground">×</span>
                      <div className="w-24">
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            value={item.unitPrice}
                            onChange={(e) => updatePrice(item.id, parseFloat(e.target.value) || 0)}
                            className="h-8 pr-6"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            €
                          </span>
                        </div>
                      </div>
                      <span className="w-20 text-right font-semibold">
                        {(item.quantity * item.unitPrice).toFixed(2)} €
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <Separator />

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notes (optionnel)</Label>
          <Textarea
            placeholder="Notes ou commentaires sur la facture..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        {/* Total */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border">
          <span className="text-lg font-medium">Total</span>
          <span className="text-2xl font-bold text-primary">{total.toFixed(2)} €</span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sendEmail"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="sendEmail" className="text-sm cursor-pointer">
              Envoyer par email au patient
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
            >
              <Save className="h-4 w-4 mr-2" />
              Brouillon
            </Button>
            <Button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
            >
              <Send className="h-4 w-4 mr-2" />
              Créer la facture
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
