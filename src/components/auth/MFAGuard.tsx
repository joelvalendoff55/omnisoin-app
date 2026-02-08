import { ReactNode } from 'react';
import { useMFA, useMFARequired } from '@/hooks/useMFA';
import { MFAEnrollment } from '@/components/auth/MFAEnrollment';
import { MFAVerification } from '@/components/auth/MFAVerification';
import { Loader2 } from 'lucide-react';

interface MFAGuardProps {
  children: ReactNode;
}

export function MFAGuard({ children }: MFAGuardProps) {
  const { status, loading: mfaLoading, refreshStatus } = useMFA();
  const { mfaRequired, loading: requirementLoading } = useMFARequired();

  // Show loading while checking status
  if (mfaLoading || requirementLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If MFA is not required for this user, allow access
  if (!mfaRequired) {
    return <>{children}</>;
  }

  // MFA is required - check enrollment status
  if (status === 'not_enrolled') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <MFAEnrollment 
          required={true} 
          onComplete={refreshStatus}
        />
      </div>
    );
  }

  // MFA is enrolled but not verified in current session
  if (status === 'enrolled') {
    return (
      <MFAVerification 
        onVerified={refreshStatus}
      />
    );
  }

  // MFA is verified - allow access
  return <>{children}</>;
}
