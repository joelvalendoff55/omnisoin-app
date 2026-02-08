import Link from "next/link";
import { HeartPulse } from 'lucide-react';

export default function LegalFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-muted/30 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 gradient-primary rounded-lg">
                <HeartPulse className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold">OmniSoin Assist</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              Solution de gestion pour les professionnels de santé. 
              Simplifiez votre pratique quotidienne avec nos outils de transcription, 
              gestion de patientèle et assistants IA.
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Logiciel non réglementaire — non dispositif médical
            </p>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold mb-4">Informations légales</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  to="/privacy" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link 
                  to="/legal" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link 
                  to="/terms" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Conditions d'utilisation
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a 
                  href="mailto:contact@omnisoin-assist.fr" 
                  className="hover:text-foreground transition-colors"
                >
                  contact@omnisoin-assist.fr
                </a>
              </li>
              <li>
                <a 
                  href="mailto:dpo@omnisoin-assist.fr" 
                  className="hover:text-foreground transition-colors"
                >
                  DPO : dpo@omnisoin-assist.fr
                </a>
              </li>
              <li>
                <a 
                  href="mailto:support@omnisoin-assist.fr" 
                  className="hover:text-foreground transition-colors"
                >
                  Support : support@omnisoin-assist.fr
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-border mt-8 pt-6 text-center text-sm text-muted-foreground">
          <p>© {currentYear} OmniSoin Assist. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
