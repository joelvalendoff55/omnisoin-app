"use client";

import { useState } from 'react';
import { usePathname } from "next/navigation";
import { Bug, X, Loader2, Camera, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function BugReportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  
  const pathname = usePathname();
  const { toast } = useToast();
  
  const currentUrl = `${window.location.origin}${pathname}${location.search}`;

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setScreenshot(null);
    setScreenshotPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez saisir un titre pour le bug.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Erreur',
          description: 'Vous devez être connecté pour signaler un bug.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      let screenshotUrl: string | null = null;

      // Upload screenshot if provided
      if (screenshot) {
        const fileExt = screenshot.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('bug-screenshots')
          .upload(fileName, screenshot);

        if (uploadError) {
          console.error('Screenshot upload error:', uploadError);
          // Continue without screenshot
        } else {
          const { data: urlData } = supabase.storage
            .from('bug-screenshots')
            .getPublicUrl(fileName);
          screenshotUrl = urlData.publicUrl;
        }
      }

      // Insert bug report
      const { error } = await supabase.from('bug_reports').insert({
        title: title.trim(),
        description: description.trim() || null,
        page_url: currentUrl,
        screenshot_url: screenshotUrl,
        user_id: user.id,
        status: 'open',
      });

      if (error) throw error;

      toast({
        title: 'Bug signalé',
        description: 'Merci pour votre retour ! Nous allons examiner ce problème.',
      });

      resetForm();
      setIsOpen(false);
    } catch (error) {
      console.error('Error submitting bug report:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de soumettre le rapport de bug. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Bug Report Button */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "fixed bottom-6 left-6 z-50 h-11 w-11 rounded-full shadow-lg",
          "bg-card/90 backdrop-blur-sm border-border/50",
          "hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive",
          "transition-all duration-200 hover:scale-105"
        )}
        onClick={() => setIsOpen(true)}
        aria-label="Signaler un bug"
      >
        <Bug className="h-5 w-5" />
      </Button>

      {/* Bug Report Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-destructive" />
              Signaler un bug
            </DialogTitle>
            <DialogDescription>
              Décrivez le problème rencontré. Votre retour nous aide à améliorer l'application.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bug-title">Titre du bug *</Label>
              <Input
                id="bug-title"
                placeholder="Ex: Le bouton de sauvegarde ne fonctionne pas"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bug-description">Description</Label>
              <Textarea
                id="bug-description"
                placeholder="Décrivez les étapes pour reproduire le bug, ce qui s'est passé et ce que vous attendiez..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                rows={4}
                maxLength={2000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bug-page">Page concernée</Label>
              <Input
                id="bug-page"
                value={currentUrl}
                disabled
                className="bg-muted text-muted-foreground text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Capture d'écran (optionnel)</Label>
              {screenshotPreview ? (
                <div className="relative rounded-lg border border-border overflow-hidden">
                  <img
                    src={screenshotPreview}
                    alt="Capture d'écran"
                    className="w-full h-32 object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={removeScreenshot}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label
                  htmlFor="bug-screenshot"
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed",
                    "border-border hover:border-primary/50 cursor-pointer transition-colors",
                    "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Camera className="h-8 w-8" />
                  <span className="text-sm">Cliquez pour ajouter une capture</span>
                  <input
                    id="bug-screenshot"
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotChange}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                </label>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Envoyer
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
