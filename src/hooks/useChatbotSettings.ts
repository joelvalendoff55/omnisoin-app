"use client";

import { useState, useEffect } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useStructureId } from '@/hooks/useStructureId';
import { toast } from 'sonner';

export interface QuickQuestion {
  label: string;
  icon: string;
  message: string;
}

export interface ChatbotSettings {
  id?: string;
  structure_id: string;
  system_prompt: string | null;
  welcome_message: string;
  quick_questions: QuickQuestion[];
  is_enabled: boolean;
}

const DEFAULT_SYSTEM_PROMPT = `Tu es OmniSoin Assist, l'assistant virtuel du portail patient OmniSoin. Tu es amical, professionnel et rassurant.

RÈGLES IMPORTANTES:
1. Tu ne donnes JAMAIS de conseils médicaux, diagnostics ou avis sur des symptômes
2. Pour toute question médicale, redirige vers la messagerie sécurisée avec l'équipe soignante
3. Tu aides uniquement pour:
   - Navigation dans le portail
   - Informations pratiques (horaires, préparation RDV, documents)
   - Prise de rendez-vous
   - Accès aux documents
   - Questions administratives

INFORMATIONS UTILES:
- Horaires d'ouverture: Du lundi au vendredi, 8h-19h. Samedi 9h-12h.
- Pour prendre RDV: Aller dans "Rendez-vous" puis "Nouveau rendez-vous"
- Documents à apporter: Carte vitale, carte mutuelle, ordonnances en cours
- Messagerie: Pour questions médicales, utiliser la section "Messages"

STYLE:
- Réponds en français
- Sois concis mais chaleureux
- Utilise des emojis avec modération (1-2 max par message)
- Propose toujours une action concrète`;

const DEFAULT_WELCOME = "Bonjour ! 👋 Je suis OmniSoin Assist, votre assistant virtuel. Comment puis-je vous aider aujourd'hui ?";

const DEFAULT_QUESTIONS: QuickQuestion[] = [
  { label: 'Prendre RDV', icon: 'calendar', message: 'Comment puis-je prendre un rendez-vous ?' },
  { label: 'Mes documents', icon: 'file-text', message: 'Comment accéder à mes documents médicaux ?' },
  { label: 'Contacter équipe', icon: 'message-square', message: 'Comment contacter mon médecin ?' },
  { label: 'Horaires', icon: 'help-circle', message: "Quels sont les horaires d'ouverture ?" },
];

export function useChatbotSettings() {
  const { structureId } = useStructureId();
  const [settings, setSettings] = useState<ChatbotSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (structureId) {
      loadSettings();
    }
  }, [structureId]);

  const loadSettings = async () => {
    if (!structureId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chatbot_settings')
        .select('*')
        .eq('structure_id', structureId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          structure_id: data.structure_id,
          system_prompt: data.system_prompt,
          welcome_message: data.welcome_message || DEFAULT_WELCOME,
          quick_questions: Array.isArray(data.quick_questions) 
            ? (data.quick_questions as unknown as QuickQuestion[]) 
            : DEFAULT_QUESTIONS,
          is_enabled: data.is_enabled,
        });
      } else {
        // Use defaults
        setSettings({
          structure_id: structureId,
          system_prompt: null,
          welcome_message: DEFAULT_WELCOME,
          quick_questions: DEFAULT_QUESTIONS,
          is_enabled: true,
        });
      }
    } catch (error) {
      console.error('Error loading chatbot settings:', error);
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<ChatbotSettings>) => {
    if (!structureId) return false;
    
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const payload = {
        structure_id: structureId,
        system_prompt: newSettings.system_prompt ?? settings?.system_prompt ?? null,
        welcome_message: newSettings.welcome_message ?? settings?.welcome_message ?? DEFAULT_WELCOME,
        quick_questions: JSON.parse(JSON.stringify(newSettings.quick_questions ?? settings?.quick_questions ?? DEFAULT_QUESTIONS)),
        is_enabled: newSettings.is_enabled ?? settings?.is_enabled ?? true,
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('chatbot_settings')
        .upsert(payload, { onConflict: 'structure_id' });

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
      toast.success('Paramètres du chatbot sauvegardés');
      return true;
    } catch (error) {
      console.error('Error saving chatbot settings:', error);
      toast.error('Erreur lors de la sauvegarde');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    settings,
    isLoading,
    isSaving,
    saveSettings,
    reloadSettings: loadSettings,
    DEFAULT_SYSTEM_PROMPT,
    DEFAULT_WELCOME,
    DEFAULT_QUESTIONS,
  };
}
