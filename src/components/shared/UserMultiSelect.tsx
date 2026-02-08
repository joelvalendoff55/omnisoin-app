import { useState, useMemo, useEffect } from 'react';
import { Check, ChevronsUpDown, X, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { supabase } from '@/integrations/supabase/client';
import { useStructureId } from '@/hooks/useStructureId';

interface UserOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface UserMultiSelectProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function UserMultiSelect({
  selectedIds,
  onChange,
  placeholder = 'Sélectionner des utilisateurs...',
  disabled = false,
  className,
}: UserMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const { structureId } = useStructureId();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!structureId) return;

      try {
        // Get all user_ids in the structure
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('structure_id', structureId)
          .eq('is_active', true);

        if (!roleData || roleData.length === 0) {
          setUsers([]);
          setLoading(false);
          return;
        }

        const userIds = [...new Set(roleData.map(r => r.user_id))];

        // Get profiles for these users
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', userIds);

        setUsers(
          (profiles || []).map(p => ({
            id: p.user_id,
            first_name: p.first_name,
            last_name: p.last_name,
          }))
        );
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [structureId]);

  const selectedUsers = useMemo(
    () => users.filter(u => selectedIds.includes(u.id)),
    [users, selectedIds]
  );

  const getDisplayName = (user: UserOption) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return 'Utilisateur';
  };

  const getInitials = (user: UserOption) => {
    const first = user.first_name?.[0] || '';
    const last = user.last_name?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  const toggleUser = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onChange(selectedIds.filter(id => id !== userId));
    } else {
      onChange([...selectedIds, userId]);
    }
  };

  const removeUser = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter(id => id !== userId));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            'w-full justify-between h-auto min-h-10',
            selectedUsers.length > 0 && 'py-2',
            className
          )}
        >
          <div className="flex flex-wrap gap-1.5 flex-1 text-left">
            {selectedUsers.length === 0 ? (
              <span className="text-muted-foreground">
                {loading ? 'Chargement...' : placeholder}
              </span>
            ) : (
              selectedUsers.map(user => (
                <Badge
                  key={user.id}
                  variant="secondary"
                  className="gap-1.5 pr-1"
                >
                  <Avatar className="h-4 w-4">
                    <AvatarFallback className="text-[10px]">
                      {getInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                  {getDisplayName(user)}
                  <button
                    type="button"
                    onClick={(e) => removeUser(user.id, e)}
                    className="ml-1 rounded-full hover:bg-background/50 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher un utilisateur..." />
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
                <User className="h-8 w-8" />
                <p>Aucun utilisateur trouvé</p>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {users.map(user => {
                const isSelected = selectedIds.includes(user.id);
                return (
                  <CommandItem
                    key={user.id}
                    value={getDisplayName(user)}
                    onSelect={() => toggleUser(user.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {getInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1">{getDisplayName(user)}</span>
                    </div>
                    <Check
                      className={cn(
                        'ml-2 h-4 w-4',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
