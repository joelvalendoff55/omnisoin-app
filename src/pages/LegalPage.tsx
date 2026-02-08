import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import LegalFooter from '@/components/layout/LegalFooter';

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>

        <h1 className="text-3xl font-bold mb-8">Mentions Légales</h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">1. Éditeur du site</h2>
            <p>
              Le site OmniSoin Assist est édité par :<br /><br />
              <strong>[Nom de la société]</strong><br />
              Forme juridique : [SARL/SAS/etc.]<br />
              Capital social : [Montant] euros<br />
              RCS [Ville] : [Numéro SIREN]<br />
              N° TVA Intracommunautaire : [Numéro]<br /><br />
              Siège social : [Adresse complète]<br />
              Téléphone : [Numéro]<br />
              Email : contact@omnisoin-assist.fr
            </p>
            <p className="mt-4">
              Directeur de la publication : [Nom du directeur]
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">2. Hébergement</h2>
            <p>
              Le site est hébergé par un prestataire certifié Hébergeur de Données de Santé (HDS) 
              conformément aux dispositions de l'article L.1111-8 du Code de la santé publique.
            </p>
            <p className="mt-4">
              <strong>Hébergeur infrastructure :</strong><br />
              Supabase Inc.<br />
              970 Toa Payoh North #07-04<br />
              Singapore 318992<br />
              Les données sont stockées dans des datacenters européens.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">3. Nature du service</h2>
            <p className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-4 rounded-lg">
              <strong>⚠️ Avertissement important :</strong><br /><br />
              OmniSoin Assist est un <strong>logiciel d'assistance administrative</strong> destiné aux 
              professionnels de santé. Il n'est <strong>PAS un dispositif médical</strong> au sens du 
              Règlement (UE) 2017/745 et n'est pas destiné à remplacer le jugement clinique du praticien.
            </p>
            <p className="mt-4">
              Les fonctionnalités de transcription et de résumé automatique sont fournies à titre 
              d'aide à la saisie. Le praticien reste seul responsable de la validation et de 
              l'exactitude des informations consignées dans les dossiers patients.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">4. Propriété intellectuelle</h2>
            <p>
              L'ensemble du contenu du site (textes, graphiques, logos, icônes, images, 
              clips audio et vidéo, logiciels) est la propriété exclusive de [Nom de la société] 
              ou de ses partenaires et est protégé par les lois françaises et internationales 
              relatives à la propriété intellectuelle.
            </p>
            <p className="mt-4">
              Toute reproduction, représentation, modification, publication, adaptation ou 
              exploitation de tout ou partie des éléments du site est interdite sans 
              l'autorisation écrite préalable de [Nom de la société].
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">5. Responsabilité</h2>
            <p>
              [Nom de la société] s'efforce d'assurer l'exactitude et la mise à jour des 
              informations diffusées sur ce site, dont elle se réserve le droit de corriger 
              le contenu à tout moment et sans préavis.
            </p>
            <p className="mt-4">
              Toutefois, [Nom de la société] ne peut garantir l'exactitude, la précision ou 
              l'exhaustivité des informations mises à disposition sur ce site et décline toute 
              responsabilité pour toute imprécision, inexactitude ou omission portant sur des 
              informations disponibles sur ce site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">6. Cookies</h2>
            <p>
              Le site utilise des cookies pour son fonctionnement et l'analyse d'audience.
            </p>
            <h3 className="text-lg font-medium mt-4 mb-2">Types de cookies utilisés :</h3>
            <table className="w-full border-collapse border border-border">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-2 text-left">Type</th>
                  <th className="border border-border p-2 text-left">Finalité</th>
                  <th className="border border-border p-2 text-left">Durée</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border p-2">Essentiels</td>
                  <td className="border border-border p-2">Authentification, session utilisateur</td>
                  <td className="border border-border p-2">Session / 30 jours</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">Analytics</td>
                  <td className="border border-border p-2">Mesure d'audience anonymisée</td>
                  <td className="border border-border p-2">13 mois</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">Préférences</td>
                  <td className="border border-border p-2">Mémorisation des choix utilisateur</td>
                  <td className="border border-border p-2">12 mois</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-4">
              Vous pouvez gérer vos préférences de cookies à tout moment via le bandeau de 
              consentement accessible en bas de page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">7. Liens hypertextes</h2>
            <p>
              Le site peut contenir des liens hypertextes vers d'autres sites. [Nom de la société] 
              n'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur 
              contenu.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">8. Droit applicable</h2>
            <p>
              Les présentes mentions légales sont régies par le droit français. En cas de litige, 
              les tribunaux français seront seuls compétents.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">9. Contact</h2>
            <p>
              Pour toute question concernant ces mentions légales, vous pouvez nous contacter à 
              l'adresse suivante : <strong>legal@omnisoin-assist.fr</strong>
            </p>
          </section>
        </div>
      </div>
      <LegalFooter />
    </div>
  );
}
