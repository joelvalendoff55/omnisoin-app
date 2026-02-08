import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, Upload, Settings, BarChart3 } from 'lucide-react';
import { useRole } from '@/hooks/useRole';

export default function DashboardQuickLinks() {
  const { isAdmin, isCoordinator } = useRole();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Raccourcis</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        <Button variant="outline" asChild className="h-auto py-3 flex-col gap-1">
          <Link href="/patients">
            <UserPlus className="h-5 w-5" />
            <span className="text-xs">Nouveau patient</span>
          </Link>
        </Button>
        <Button variant="outline" asChild className="h-auto py-3 flex-col gap-1">
          <Link href="/transcripts">
            <Upload className="h-5 w-5" />
            <span className="text-xs">Uploader audio</span>
          </Link>
        </Button>
        {(isAdmin || isCoordinator) && (
          <Button variant="outline" asChild className="h-auto py-3 flex-col gap-1">
            <Link href="/stats">
              <BarChart3 className="h-5 w-5" />
              <span className="text-xs">Statistiques</span>
            </Link>
          </Button>
        )}
        <Button variant="outline" asChild className="h-auto py-3 flex-col gap-1">
          <Link href="/settings">
            <Settings className="h-5 w-5" />
            <span className="text-xs">Paramètres</span>
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
