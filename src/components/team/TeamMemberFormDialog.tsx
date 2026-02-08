import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import {
  TeamMember,
  TeamMemberFormData,
  JOB_TITLE_OPTIONS,
  SPECIALTY_OPTIONS,
} from '@/lib/team';
import { supabase } from '@/integrations/supabase/client';
import { useStructureId } from '@/hooks/useStructureId';

const formSchema = z.object({
  user_id: z.string().min(1, 'Sélectionnez un utilisateur'),
  job_title: z.string().min(1, 'Sélectionnez un poste'),
  specialty: z.string().optional(),
  professional_id: z.string().optional(),
  is_available: z.boolean(),
  works_pdsa: z.boolean(),
  max_patients_per_day: z.coerce.number().optional().nullable(),
  professional_phone: z.string().optional(),
  professional_email: z.string().email('Email invalide').optional().or(z.literal('')),
  notes: z.string().optional(),
});

interface TeamMemberFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMember | null;
  onCreate: (data: TeamMemberFormData) => Promise<TeamMember | null>;
  onUpdate: (id: string, data: Partial<TeamMemberFormData>) => Promise<TeamMember | null>;
}

interface ProfileOption {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
}

export default function TeamMemberFormDialog({
  open,
  onOpenChange,
  member,
  onCreate,
  onUpdate,
}: TeamMemberFormDialogProps) {
  const { structureId } = useStructureId();
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!member;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      user_id: '',
      job_title: '',
      specialty: '',
      professional_id: '',
      is_available: true,
      works_pdsa: false,
      max_patients_per_day: null,
      professional_phone: '',
      professional_email: '',
      notes: '',
    },
  });

  // Load profiles for user selection
  useEffect(() => {
    if (!open || !structureId) return;

    const loadProfiles = async () => {
      setLoadingProfiles(true);
      try {
        // Get org_members for this structure, then fetch their profiles
        const { data: members, error: membersError } = await supabase
          .from('org_members')
          .select('user_id')
          .eq('structure_id', structureId)
          .eq('is_active', true);

        if (membersError) throw membersError;

        const userIds = (members || []).map(m => m.user_id);
        if (userIds.length === 0) {
          setProfiles([]);
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', userIds);

        if (error) throw error;
        setProfiles(data || []);
      } catch (err) {
        console.error('Error loading profiles:', err);
      } finally {
        setLoadingProfiles(false);
      }
    };

    loadProfiles();
  }, [open, structureId]);

  // Reset form when member changes
  useEffect(() => {
    if (member) {
      form.reset({
        user_id: member.user_id,
        job_title: member.job_title,
        specialty: member.specialty || '',
        professional_id: member.professional_id || '',
        is_available: member.is_available,
        works_pdsa: member.works_pdsa,
        max_patients_per_day: member.max_patients_per_day,
        professional_phone: member.professional_phone || '',
        professional_email: member.professional_email || '',
        notes: member.notes || '',
      });
    } else {
      form.reset({
        user_id: '',
        job_title: '',
        specialty: '',
        professional_id: '',
        is_available: true,
        works_pdsa: false,
        max_patients_per_day: null,
        professional_phone: '',
        professional_email: '',
        notes: '',
      });
    }
  }, [member, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setSubmitting(true);
    try {
      const formData: TeamMemberFormData = {
        user_id: values.user_id,
        job_title: values.job_title,
        specialty: values.specialty || null,
        professional_id: values.professional_id || null,
        is_available: values.is_available,
        works_pdsa: values.works_pdsa,
        max_patients_per_day: values.max_patients_per_day || null,
        professional_phone: values.professional_phone || null,
        professional_email: values.professional_email || null,
        notes: values.notes || null,
      };

      let result;
      if (isEditing && member) {
        result = await onUpdate(member.id, formData);
      } else {
        result = await onCreate(formData);
      }

      if (result) {
        onOpenChange(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier le membre' : 'Ajouter un membre'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            data-testid="team-member-form"
          >
            {/* User Selection */}
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Utilisateur</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isEditing || loadingProfiles}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un utilisateur" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.user_id} value={profile.user_id}>
                          {profile.first_name} {profile.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Job Title */}
            <FormField
              control={form.control}
              name="job_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poste</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un poste" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {JOB_TITLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Specialty */}
            <FormField
              control={form.control}
              name="specialty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Spécialité</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une spécialité" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SPECIALTY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Professional ID */}
            <FormField
              control={form.control}
              name="professional_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>N° professionnel (RPPS/ADELI)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 123456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Availability & PDSA */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="is_available"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel className="text-sm">Disponible</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="works_pdsa"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel className="text-sm">PDSA</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Max Patients */}
            <FormField
              control={form.control}
              name="max_patients_per_day"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patients max/jour</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ex: 20"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="professional_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone pro</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 0612345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="professional_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email pro</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: pro@mail.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notes internes..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
