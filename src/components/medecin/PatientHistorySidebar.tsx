"use client";

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { History, Calendar, FileText, Pill, ChevronRight, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Consultation {
  id: string;
  consultation_date: string;
  motif: string | null;
  conclusion: string | null;
  notes_cliniques: string | null;
  examen_clinique: string | null;
}

interface PatientHistorySidebarProps {
  patientId: string | undefined;
  patientName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PatientHistorySidebar({ 
  patientId, 
  patientName,
  open, 
  onOpenChange 
}: PatientHistorySidebarProps) {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);

  useEffect(() => {
    if (open && patientId) {
      loadConsultations();
    }
  }, [open, patientId]);

  const loadConsultations = async () => {
    if (!patientId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('id, consultation_date, motif, conclusion, notes_cliniques, examen_clinique')
        .eq('patient_id', patientId)
        .order('consultation_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      setConsultations(data || []);
    } catch (err) {
      console.error('Error loading consultations:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Historique patient
            {patientName && (
              <Badge variant="outline" className="ml-2 font-normal">
                {patientName}
              </Badge>
            )}
          </SheetTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>5 dernières consultations</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded">H</kbd>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="p-4 space-y-3">
            {loading ? (
              <>
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </>
            ) : consultations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Aucune consultation antérieure</p>
                {!patientId && (
                  <p className="text-sm mt-1">Sélectionnez un patient pour voir son historique</p>
                )}
              </div>
            ) : (
              <>
                {/* Consultation List */}
                {!selectedConsultation && consultations.map((consultation) => (
                  <Card 
                    key={consultation.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setSelectedConsultation(consultation)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {format(new Date(consultation.consultation_date), 'dd MMMM yyyy', { locale: fr })}
                            </span>
                          </div>
                          
                          {consultation.motif && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              <span className="font-medium">Motif:</span> {consultation.motif}
                            </p>
                          )}
                          
                          {consultation.conclusion && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              <span className="font-medium">Conclusion:</span> {consultation.conclusion}
                            </p>
                          )}
                        </div>
                        
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Consultation Detail */}
                {selectedConsultation && (
                  <div className="space-y-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedConsultation(null)}
                      className="mb-2"
                    >
                      ← Retour à la liste
                    </Button>
                    
                    <Card>
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center gap-2 text-primary font-medium">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(selectedConsultation.consultation_date), 'EEEE dd MMMM yyyy', { locale: fr })}
                        </div>
                        
                        {selectedConsultation.motif && (
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Motif
                            </label>
                            <p className="text-sm bg-muted/50 p-3 rounded-lg">
                              {selectedConsultation.motif}
                            </p>
                          </div>
                        )}
                        
                        {selectedConsultation.examen_clinique && (
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Examen clinique
                            </label>
                            <p className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">
                              {selectedConsultation.examen_clinique}
                            </p>
                          </div>
                        )}
                        
                        {selectedConsultation.notes_cliniques && (
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Notes cliniques
                            </label>
                            <p className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">
                              {selectedConsultation.notes_cliniques}
                            </p>
                          </div>
                        )}
                        
                        {selectedConsultation.conclusion && (
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Conclusion
                            </label>
                            <p className="text-sm bg-primary/5 border border-primary/20 p-3 rounded-lg whitespace-pre-wrap">
                              {selectedConsultation.conclusion}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
