import { TeamMember, getJobTitleLabel, getSpecialtyLabel } from '@/lib/team';
import { TeamMemberTasksList } from '@/components/tasks/TasksList';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Phone,
  Mail,
  Briefcase,
  Stethoscope,
  IdCard,
  Users,
  Calendar,
  Pencil,
  UserMinus,
  CheckSquare,
} from 'lucide-react';

interface TeamMemberDetailDrawerProps {
  member: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  onEdit: () => void;
  onDeactivate: () => void;
}

export default function TeamMemberDetailDrawer({
  member,
  open,
  onOpenChange,
  canManage,
  onEdit,
  onDeactivate,
}: TeamMemberDetailDrawerProps) {
  if (!member) return null;

  const firstName = member.profile?.first_name || '';
  const lastName = member.profile?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Membre';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'M';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <div className="mx-auto w-full max-w-lg overflow-y-auto">
          <DrawerHeader className="text-left">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-lg text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <DrawerTitle className="text-xl">{fullName}</DrawerTitle>
                <DrawerDescription>
                  {getJobTitleLabel(member.job_title)}
                </DrawerDescription>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant={member.is_available ? 'default' : 'secondary'}>
                {member.is_available ? 'Disponible' : 'Indisponible'}
              </Badge>
              {member.works_pdsa && (
                <Badge variant="outline" className="border-orange-500 text-orange-600">
                  PDSA
                </Badge>
              )}
            </div>
          </DrawerHeader>

          <div className="px-4 pb-4">
            <Separator className="my-4" />

            {/* Details */}
            <div className="space-y-4">
              {member.specialty && (
                <div className="flex items-center gap-3">
                  <Stethoscope className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Spécialité</p>
                    <p className="font-medium">{getSpecialtyLabel(member.specialty)}</p>
                  </div>
                </div>
              )}

              {member.professional_id && (
                <div className="flex items-center gap-3">
                  <IdCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">N° professionnel</p>
                    <p className="font-medium">{member.professional_id}</p>
                  </div>
                </div>
              )}

              {member.max_patients_per_day && (
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Patients max/jour</p>
                    <p className="font-medium">{member.max_patients_per_day}</p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Contact */}
              <div>
                <h4 className="mb-2 flex items-center gap-2 font-medium">
                  <Briefcase className="h-4 w-4" />
                  Contact professionnel
                </h4>
                <div className="space-y-2 text-sm">
                  {member.professional_phone ? (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`tel:${member.professional_phone}`}
                        className="text-primary hover:underline"
                      >
                        {member.professional_phone}
                      </a>
                    </div>
                  ) : null}
                  {member.professional_email ? (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`mailto:${member.professional_email}`}
                        className="text-primary hover:underline"
                      >
                        {member.professional_email}
                      </a>
                    </div>
                  ) : null}
                  {!member.professional_phone && !member.professional_email && (
                    <p className="text-muted-foreground">Aucun contact renseigné</p>
                  )}
                </div>
              </div>

              {member.notes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="mb-2 font-medium">Notes</h4>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {member.notes}
                    </p>
                  </div>
                </>
              )}

              <Separator />

              {/* Assigned Tasks */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 font-medium">
                  <CheckSquare className="h-4 w-4" />
                  Tâches assignées
                </h4>
                <TeamMemberTasksList teamMemberId={member.id} />
              </div>

              <Separator />

              {/* Metadata */}
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Membre depuis le {formatDate(member.created_at)}</span>
              </div>
            </div>
          </div>

          {canManage && (
            <DrawerFooter className="flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Modifier
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={onDeactivate}
              >
                <UserMinus className="mr-2 h-4 w-4" />
                Désactiver
              </Button>
            </DrawerFooter>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
