import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import LegalFooter from '@/components/layout/LegalFooter';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>

        <h1 className="text-3xl font-bold mb-8">Conditions Générales d'Utilisation</h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Version en vigueur au {new Date().toLocaleDateString('fr-FR')}
          </p>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">1. Objet</h2>
            <p>
              Les présentes Conditions Générales d'Utilisation (CGU) ont pour objet de définir 
              les modalités et conditions d'utilisation du service OmniSoin Assist, ainsi que 
              de définir les droits et obligations des parties dans ce cadre.
            </p>
            <p className="mt-4">
              OmniSoin Assist est une solution logicielle destinée aux professionnels de santé 
              pour la gestion de leur activité (gestion de patientèle, transcription de 
              consultations, gestion des rendez-vous, etc.).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">2. Acceptation des CGU</h2>
            <p>
              L'utilisation du service implique l'acceptation pleine et entière des présentes CGU. 
              En créant un compte, l'utilisateur reconnaît avoir pris connaissance des présentes 
              conditions et les accepte sans réserve.
            </p>
            <p className="mt-4">
              [Nom de la société] se réserve le droit de modifier les présentes CGU à tout moment. 
              Les utilisateurs seront informés de toute modification par email ou notification 
              dans l'application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">3. Description du service</h2>
            <p>OmniSoin Assist propose les fonctionnalités suivantes :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Gestion de la patientèle et des dossiers patients</li>
              <li>Gestion des rendez-vous et de la file d'attente</li>
              <li>Transcription audio des consultations</li>
              <li>Génération de résumés par intelligence artificielle</li>
              <li>Messagerie et intégration WhatsApp</li>
              <li>Gestion des tâches et des équipes</li>
              <li>Numérisation et OCR de documents</li>
            </ul>
            <p className="mt-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-4 rounded-lg">
              <strong>⚠️ Important :</strong> OmniSoin Assist n'est pas un dispositif médical. 
              Les fonctionnalités d'IA sont fournies à titre d'assistance et ne remplacent 
              pas le jugement clinique du praticien.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">4. Conditions d'accès</h2>
            <h3 className="text-lg font-medium mt-4 mb-2">4.1 Éligibilité</h3>
            <p>
              Le service est réservé aux professionnels de santé et à leur personnel. 
              L'utilisateur doit être majeur et disposer de la capacité juridique pour 
              contracter.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">4.2 Création de compte</h3>
            <p>
              L'accès au service nécessite la création d'un compte avec une adresse email 
              valide. L'utilisateur s'engage à fournir des informations exactes et à les 
              maintenir à jour.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">4.3 Sécurité du compte</h3>
            <p>
              L'utilisateur est responsable de la confidentialité de ses identifiants de 
              connexion. Toute utilisation du compte est réputée effectuée par l'utilisateur 
              titulaire. En cas de suspicion d'utilisation frauduleuse, l'utilisateur doit 
              immédiatement en informer [Nom de la société].
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">5. Obligations de l'utilisateur</h2>
            <p>L'utilisateur s'engage à :</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Utiliser le service conformément à sa destination et aux lois en vigueur</li>
              <li>Respecter les règles déontologiques de sa profession</li>
              <li>Obtenir le consentement des patients pour le traitement de leurs données de santé</li>
              <li>Vérifier l'exactitude des informations saisies ou générées automatiquement</li>
              <li>Ne pas tenter de contourner les mesures de sécurité du service</li>
              <li>Ne pas utiliser le service à des fins illégales ou non autorisées</li>
              <li>Signaler tout dysfonctionnement ou faille de sécurité</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">6. Données personnelles et de santé</h2>
            <p>
              L'utilisateur est responsable de traitement des données de santé de ses patients 
              au sens du RGPD. [Nom de la société] agit en qualité de sous-traitant.
            </p>
            <p className="mt-4">
              L'utilisateur s'engage à :
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Recueillir le consentement explicite des patients pour le traitement de leurs données de santé</li>
              <li>Informer les patients de leurs droits (accès, rectification, effacement...)</li>
              <li>Respecter le secret médical et professionnel</li>
              <li>Ne pas transférer de données en dehors du service sans garanties appropriées</li>
            </ul>
            <p className="mt-4">
              Pour plus d'informations, consultez notre{' '}
              <Link to="/privacy" className="text-primary hover:underline">Politique de Confidentialité</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">7. Propriété intellectuelle</h2>
            <p>
              Tous les droits de propriété intellectuelle relatifs au service (logiciel, interface, 
              documentation, marques) appartiennent à [Nom de la société] ou à ses concédants.
            </p>
            <p className="mt-4">
              L'utilisateur dispose d'un droit d'utilisation personnel, non exclusif et non 
              transférable du service pour la durée de son abonnement.
            </p>
            <p className="mt-4">
              L'utilisateur conserve la propriété intellectuelle des données qu'il saisit dans le service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">8. Disponibilité du service</h2>
            <p>
              [Nom de la société] s'efforce d'assurer une disponibilité du service 24h/24, 7j/7, 
              mais ne peut garantir une disponibilité continue sans interruption.
            </p>
            <p className="mt-4">
              Des maintenances programmées peuvent entraîner des interruptions temporaires. 
              Les utilisateurs seront informés dans la mesure du possible.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">9. Limitation de responsabilité</h2>
            <p>
              [Nom de la société] ne pourra être tenue responsable :
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Des décisions médicales prises sur la base des informations du service</li>
              <li>Des erreurs de transcription ou de résumé automatique non vérifiées par l'utilisateur</li>
              <li>De l'utilisation non conforme du service par l'utilisateur</li>
              <li>Des dommages indirects, perte de données ou perte d'exploitation</li>
              <li>Des interruptions de service dues à des causes externes (internet, hébergeur...)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">10. Résiliation</h2>
            <p>
              L'utilisateur peut résilier son compte à tout moment depuis les paramètres de 
              son compte ou en contactant le support.
            </p>
            <p className="mt-4">
              [Nom de la société] peut suspendre ou résilier l'accès au service en cas de 
              violation des présentes CGU, après mise en demeure restée sans effet pendant 15 jours.
            </p>
            <p className="mt-4">
              En cas de résiliation, l'utilisateur peut demander l'export de ses données 
              conformément au droit à la portabilité.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">11. Droit applicable et litiges</h2>
            <p>
              Les présentes CGU sont régies par le droit français.
            </p>
            <p className="mt-4">
              En cas de litige, les parties s'efforceront de trouver une solution amiable. 
              À défaut, les tribunaux de [Ville] seront seuls compétents.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">12. Contact</h2>
            <p>
              Pour toute question relative aux présentes CGU :<br />
              Email : <strong>support@omnisoin-assist.fr</strong><br />
              Adresse : [Adresse complète]
            </p>
          </section>
        </div>
      </div>
      <LegalFooter />
    </div>
  );
}
