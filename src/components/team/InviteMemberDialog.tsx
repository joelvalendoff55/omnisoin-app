import { useState } from 'react';
import { useStructureId } from '@/hooks/useStructureId';
import { useAuth } from '@/hooks/useAuth';
import { OrgRole, ROLE_LABELS, ROLE_ORDER } from '@/lib/structureMembers';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Mail, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Roles that can be invited (exclude owner)
const INVITABLE_ROLES: OrgRole[] = ['admin', 'doctor', 'ipa', 'nurse', 'coordinator', 'assistant'];

export default function InviteMemberDialog({ 
  open, 
  onOpenChange, 
  onSuccess 
}: InviteMemberDialogProps) {
  const { structureId } = useStructureId();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('assistant');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get structure name for the email
  const [structureName, setStructureName] = useState<string>('');

  // Fetch structure name when dialog opens
  useState(() => {
    if (open && structureId) {
      supabase
        .from('structures')
        .select('name')
        .eq('id', structureId)
        .single()
        .then(({ data }) => {
          if (data) setStructureName(data.name);
        });
    }
  });

  // Get inviter name
  const getInviterName = async () => {
    if (!user) return 'Un administrateur';
    const { data } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', user.id)
      .single();
    
    if (data?.first_name || data?.last_name) {
      return `${data.first_name || ''} ${data.last_name || ''}`.trim();
    }
    return 'Un administrateur';
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Veuillez entrer une adresse email');
      return;
    }

    if (!validateEmail(email.trim())) {
      setError('Veuillez entrer une adresse email valide');
      return;
    }

    if (!structureId) {
      setError('Structure non trouvée');
      return;
    }

    setLoading(true);
    try {
      const inviterName = await getInviterName();

      const { data, error: fnError } = await supabase.functions.invoke('send-member-invitation', {
        body: {
          email: email.trim().toLowerCase(),
          role,
          structure_id: structureId,
          structure_name: structureName || 'La structure',
          inviter_name: inviterName,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      toast.success(`Invitation envoyée à ${email}`);
      setEmail('');
      setRole('assistant');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error('Error sending invitation:', err);
      setError(err.message || 'Erreur lors de l\'envoi de l\'invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('assistant');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Inviter un membre
          </DialogTitle>
          <DialogDescription>
            Envoyez une invitation par email pour rejoindre votre structure.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Adresse email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemple@email.com"
                className="pl-10"
                disabled={loading}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Select value={role} onValueChange={(v) => setRole(v as OrgRole)} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                {INVITABLE_ROLES.map(r => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !email.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Envoyer l'invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
