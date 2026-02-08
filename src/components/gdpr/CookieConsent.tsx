"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Cookie, Settings, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const COOKIE_CONSENT_KEY = 'omnisoin_cookie_consent';
const COOKIE_PREFERENCES_KEY = 'omnisoin_cookie_preferences';

export interface CookiePreferences {
  essential: boolean; // Always true, cannot be disabled
  analytics: boolean;
  marketing: boolean;
  consented_at: string;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  analytics: false,
  marketing: false,
  consented_at: '',
};

export function getCookiePreferences(): CookiePreferences | null {
  try {
    const stored = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parsing errors
  }
  return null;
}

export function hasAnalyticsConsent(): boolean {
  const prefs = getCookiePreferences();
  return prefs?.analytics ?? false;
}

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const hasConsented = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!hasConsented) {
      // Delay showing banner for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = (prefs: CookiePreferences) => {
    const finalPrefs = {
      ...prefs,
      essential: true, // Always true
      consented_at: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, '1');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(finalPrefs));
    setIsVisible(false);
    setShowCustomize(false);

    // Dispatch event for analytics initialization
    if (finalPrefs.analytics) {
      window.dispatchEvent(new CustomEvent('cookieConsent', { detail: finalPrefs }));
    }
  };

  const handleAcceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
      consented_at: '',
    });
  };

  const handleRejectAll = () => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
      consented_at: '',
    });
  };

  const handleSaveCustom = () => {
    saveConsent(preferences);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur border-t border-border shadow-lg animate-in slide-in-from-bottom-4 duration-300">
        <div className="container mx-auto max-w-6xl">
          <Card className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                  <Cookie className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold">Gestion des cookies</h3>
                  <p className="text-sm text-muted-foreground">
                    Nous utilisons des cookies pour améliorer votre expérience. 
                    Les cookies essentiels sont nécessaires au fonctionnement du site. 
                    Vous pouvez personnaliser vos préférences.{' '}
                    <Link href="/privacy" className="text-primary hover:underline">
                      En savoir plus
                    </Link>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRejectAll}
                  className="flex-1 md:flex-none"
                >
                  Refuser tout
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomize(true)}
                  className="flex-1 md:flex-none"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Personnaliser
                </Button>
                <Button
                  size="sm"
                  onClick={handleAcceptAll}
                  className="flex-1 md:flex-none"
                >
                  Accepter tout
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Customize Dialog */}
      <Dialog open={showCustomize} onOpenChange={setShowCustomize}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5" />
              Préférences de cookies
            </DialogTitle>
            <DialogDescription>
              Gérez vos préférences de cookies. Les cookies essentiels ne peuvent pas être désactivés 
              car ils sont nécessaires au fonctionnement du site.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Essential Cookies */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="font-medium">Cookies essentiels</Label>
                <p className="text-sm text-muted-foreground">
                  Nécessaires au fonctionnement du site (authentification, sécurité).
                </p>
              </div>
              <Switch checked disabled />
            </div>

            {/* Analytics Cookies */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="analytics" className="font-medium">Cookies analytiques</Label>
                <p className="text-sm text-muted-foreground">
                  Nous aident à comprendre comment vous utilisez le site.
                </p>
              </div>
              <Switch
                id="analytics"
                checked={preferences.analytics}
                onCheckedChange={(checked) => 
                  setPreferences((prev) => ({ ...prev, analytics: checked }))
                }
              />
            </div>

            {/* Marketing Cookies */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="marketing" className="font-medium">Cookies marketing</Label>
                <p className="text-sm text-muted-foreground">
                  Utilisés pour personnaliser les publicités (non utilisés actuellement).
                </p>
              </div>
              <Switch
                id="marketing"
                checked={preferences.marketing}
                onCheckedChange={(checked) => 
                  setPreferences((prev) => ({ ...prev, marketing: checked }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleRejectAll}>
              Refuser tout
            </Button>
            <Button onClick={handleSaveCustom}>
              Enregistrer mes préférences
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
