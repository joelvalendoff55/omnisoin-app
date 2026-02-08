"use client";

import { TeamMember, getJobTitleLabel, getSpecialtyLabel } from '@/lib/team';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MoreVertical, Pencil, UserMinus, Phone, Mail } from 'lucide-react';

interface TeamMemberCardProps {
  member: TeamMember;
  canManage: boolean;
  onEdit: () => void;
  onDeactivate: () => void;
  onClick: () => void;
}

export default function TeamMemberCard({
  member,
  canManage,
  onEdit,
  onDeactivate,
  onClick,
}: TeamMemberCardProps) {
  const firstName = member.profile?.first_name || '';
  const lastName = member.profile?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Membre';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'M';

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
      data-testid="team-member-card"
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-medium text-foreground">{fullName}</h3>
              <p className="text-sm text-muted-foreground">
                {getJobTitleLabel(member.job_title)}
              </p>
              {member.specialty && (
                <p className="text-xs text-muted-foreground">
                  {getSpecialtyLabel(member.specialty)}
                </p>
              )}
            </div>
          </div>

          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeactivate();
                  }}
                  className="text-destructive"
                >
                  <UserMinus className="mr-2 h-4 w-4" />
                  Désactiver
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Badges */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant={member.is_available ? 'default' : 'secondary'}>
            {member.is_available ? 'Disponible' : 'Indisponible'}
          </Badge>
          {member.works_pdsa && (
            <Badge variant="outline" className="border-orange-500 text-orange-600">
              PDSA
            </Badge>
          )}
        </div>

        {/* Contact info */}
        {(member.professional_phone || member.professional_email) && (
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {member.professional_phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {member.professional_phone}
              </span>
            )}
            {member.professional_email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {member.professional_email}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
