import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  StickyNote,
  Plus,
  Search,
  Edit,
  Trash2,
  User,
  Clock,
  Save,
} from 'lucide-react';
import { CopyToClipboard } from '@/components/shared/CopyToClipboard';
import { formatMedicalNote, formatAllNotes, MedicalNote } from '@/lib/medecinFormatter';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Mock patients for demo
const MOCK_PATIENTS = [
  { id: '1', name: 'Martin Dupont' },
  { id: '2', name: 'Sophie Bernard' },
  { id: '3', name: 'Jean-Pierre Martin' },
  { id: '4', name: 'Marie Lefevre' },
];

// Mock notes
const MOCK_NOTES: MedicalNote[] = [
  {
    id: '1',
    patient_id: '1',
    patient_name: 'Martin Dupont',
    content: 'Patient diabétique de type 2 depuis 2018. Bon équilibre glycémique sous metformine 1000mg x2/j. À surveiller : fonction rénale (dernière créat 85 µmol/L).',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    patient_id: '2',
    patient_name: 'Sophie Bernard',
    content: 'Suivi post-opératoire cholécystectomie. Cicatrisation normale. Reprise alimentation progressive OK.',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    patient_id: '1',
    patient_name: 'Martin Dupont',
    content: 'HbA1c de contrôle : 6.8%. Objectif maintenu. Continuer traitement actuel.',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function NotesSection() {
  const [notes, setNotes] = useState<MedicalNote[]>(MOCK_NOTES);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPatient, setFilterPatient] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<MedicalNote | null>(null);
  
  // New note form state
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [noteContent, setNoteContent] = useState('');

  const filteredNotes = notes.filter((note) => {
    const matchesSearch = searchQuery === '' ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.patient_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPatient = filterPatient === 'all' || note.patient_id === filterPatient;
    
    return matchesSearch && matchesPatient;
  });

  const handleSaveNote = () => {
    if (!selectedPatient || !noteContent.trim()) return;

    const patient = MOCK_PATIENTS.find((p) => p.id === selectedPatient);
    if (!patient) return;

    if (editingNote) {
      // Update existing note
      setNotes(notes.map((n) =>
        n.id === editingNote.id
          ? { ...n, content: noteContent, updated_at: new Date().toISOString() }
          : n
      ));
    } else {
      // Create new note
      const newNote: MedicalNote = {
        id: Date.now().toString(),
        patient_id: selectedPatient,
        patient_name: patient.name,
        content: noteContent.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setNotes([newNote, ...notes]);
    }

    resetForm();
  };

  const handleEditNote = (note: MedicalNote) => {
    setEditingNote(note);
    setSelectedPatient(note.patient_id);
    setNoteContent(note.content);
    setIsDialogOpen(true);
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter((n) => n.id !== id));
  };

  const resetForm = () => {
    setSelectedPatient('');
    setNoteContent('');
    setEditingNote(null);
    setIsDialogOpen(false);
  };

  // Group notes by patient
  const notesByPatient = filteredNotes.reduce((acc, note) => {
    if (!acc[note.patient_id]) {
      acc[note.patient_id] = {
        patient_name: note.patient_name,
        notes: [],
      };
    }
    acc[note.patient_id].notes.push(note);
    return acc;
  }, {} as Record<string, { patient_name: string; notes: MedicalNote[] }>);

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans les notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterPatient} onValueChange={setFilterPatient}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrer par patient" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les patients</SelectItem>
            {MOCK_PATIENTS.map((patient) => (
              <SelectItem key={patient.id} value={patient.id}>
                {patient.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) resetForm();
          setIsDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle note
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingNote ? 'Modifier la note' : 'Nouvelle note'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Patient</label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_PATIENTS.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Contenu de la note</label>
                <Textarea
                  placeholder="Saisir votre note..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={6}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>
                  Annuler
                </Button>
                <Button
                  onClick={handleSaveNote}
                  disabled={!selectedPatient || !noteContent.trim()}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <CopyToClipboard
          text={formatAllNotes(filteredNotes)}
          label="Copier tout"
          variant="outline"
        />
      </div>

      {/* Notes List */}
      {Object.keys(notesByPatient).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <StickyNote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune note trouvée</p>
            <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer une note
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-6">
            {Object.entries(notesByPatient).map(([patientId, { patient_name, notes: patientNotes }]) => (
              <Card key={patientId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    {patient_name}
                    <Badge variant="secondary" className="ml-auto">
                      {patientNotes.length} note(s)
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patientNotes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                {format(new Date(note.created_at), 'dd MMM yyyy', { locale: fr })}
                              </span>
                              {note.updated_at !== note.created_at && (
                                <span className="italic">
                                  (modifié le {format(new Date(note.updated_at), 'dd MMM', { locale: fr })})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <CopyToClipboard
                              text={formatMedicalNote(note)}
                              size="icon"
                              variant="ghost"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditNote(note)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Stats */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Total : {notes.length} note(s) pour {Object.keys(notesByPatient).length} patient(s)
            </span>
            <span className="text-muted-foreground">
              Affichées : {filteredNotes.length}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
