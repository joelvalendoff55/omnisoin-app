"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Task, TaskInsert, PRIORITY_OPTIONS, STATUS_OPTIONS, CATEGORY_OPTIONS } from '@/lib/tasks';
import { fetchPatients } from '@/lib/patients';
import { fetchTeamMembers, TeamMember } from '@/lib/team';
import { Patient } from '@/types/patient';
import { useStructureId } from '@/hooks/useStructureId';

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  onSubmit: (data: Omit<TaskInsert, 'structure_id' | 'created_by'>) => Promise<void>;
  onUpdate?: (id: string, data: Partial<Task>) => Promise<void>;
  defaultPatientId?: string;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  onSubmit,
  onUpdate,
  defaultPatientId,
}: TaskFormDialogProps) {
  const { structureId } = useStructureId();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [patientId, setPatientId] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [priority, setPriority] = useState<number>(3);
  const [status, setStatus] = useState<string>('pending');
  const [category, setCategory] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPatientId(task.patient_id || '');
      setAssignedTo(task.assigned_to || '');
      setPriority(task.priority);
      setStatus(task.status);
      setCategory(task.category || '');
      setDueDate(task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd'T'HH:mm") : '');
    } else {
      setTitle('');
      setDescription('');
      setPatientId(defaultPatientId || '');
      setAssignedTo('');
      setPriority(3);
      setStatus('pending');
      setCategory('');
      setDueDate('');
    }
  }, [task, defaultPatientId, open]);

  useEffect(() => {
    const loadData = async () => {
      if (!open || !structureId) return;

      setLoading(true);
      try {
        const [patientsData, teamData] = await Promise.all([
          fetchPatients(false),
          fetchTeamMembers(structureId),
        ]);
        setPatients(patientsData);
        setTeamMembers(teamData);
      } catch (err) {
        console.error('Error loading form data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [open, structureId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const data = {
        title: title.trim(),
        description: description.trim() || undefined,
        patient_id: patientId || null,
        assigned_to: assignedTo || null,
        priority,
        category: category || null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      };

      if (task && onUpdate) {
        await onUpdate(task.id, { ...data, status });
      } else {
        await onSubmit(data);
      }

      onOpenChange(false);
    } catch (err) {
      console.error('Error submitting task:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{task ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la tâche"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description détaillée..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priorité</Label>
              <Select
                value={priority.toString()}
                onValueChange={(v) => setPriority(parseInt(v))}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {task && (
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="patient">Patient (optionnel)</Label>
            <Select
              value={patientId || '__none__'}
              onValueChange={(v) => setPatientId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger id="patient">
                <SelectValue placeholder={loading ? 'Chargement...' : 'Sélectionner un patient'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Aucun patient</SelectItem>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignee">Assigné à</Label>
            <Select
              value={assignedTo || '__none__'}
              onValueChange={(v) => setAssignedTo(v === '__none__' ? '' : v)}
            >
              <SelectTrigger id="assignee">
                <SelectValue placeholder={loading ? 'Chargement...' : 'Sélectionner un membre'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Non assigné</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.profile?.first_name} {member.profile?.last_name} - {member.job_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Date d'échéance</Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={!title.trim() || submitting}>
              {submitting ? 'Enregistrement...' : task ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
