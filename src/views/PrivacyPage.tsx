import { ArrowLeft } from 'lucide-react';
import Link from "next/link";
import { Button } from '@/components/ui/button';
import LegalFooter from '@/components/layout/LegalFooter';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>

        <h1 className="text-3xl font-bold mb-8">Politique de Confidentialité</h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </p>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">1. Responsable du traitement</h2>
            <p>
              OmniSoin Assist est édité par [Nom de la société], société [forme juridique] au capital de [montant] euros,
              immatriculée au RCS de [ville] sous le numéro [numéro SIREN/SIRET].
            </p>
            <p>
              Siège social : [Adresse complète]<br />
              Email : contact@omnisoin-assist.fr<br />
              Téléphone : [Numéro]
            </p>
            <p>
              Délégué à la Protection des Données (DPO) : [Nom du DPO]<br />
              Contact DPO : dpo@omnisoin-assist.fr
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">2. Données collectées</h2>
            <p>Dans le cadre de l'utilisation d'OmniSoin Assist, nous collectons les catégories de données suivantes :</p>
            
            <h3 className="text-lg font-medium mt-4 mb-2">2.1 Données d'identification des professionnels</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Nom, prénom</li>
              <li>Adresse email professionnelle</li>
              <li>Numéro de téléphone professionnel</li>
              <li>Numéro RPPS (le cas échéant)</li>
              <li>Spécialité médicale</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">2.2 Données de santé des patients</h3>
            <p className="text-destructive font-medium">
              ⚠️ Ces données sont des données sensibles au sens du RGPD (Article 9)
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Identité du patient (nom, prénom, date de naissance, sexe)</li>
              <li>Coordonnées (téléphone, email)</li>
              <li>Historique médical et consultations</li>
              <li>Transcriptions audio des consultations</li>
              <li>Résumés et notes médicales</li>
              <li>Documents médicaux numérisés</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">2.3 Données techniques</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Adresse IP</li>
              <li>Logs de connexion</li>
              <li>Type de navigateur et appareil</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">3. Finalités du traitement</h2>
            <table className="w-full border-collapse border border-border">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-2 text-left">Finalité</th>
                  <th className="border border-border p-2 text-left">Base légale</th>
                  <th className="border border-border p-2 text-left">Durée de conservation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border p-2">Gestion des dossiers patients</td>
                  <td className="border border-border p-2">Obligation légale (Art. R.1112-7 CSP)</td>
                  <td className="border border-border p-2">20 ans après dernière consultation</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">Transcription des consultations</td>
                  <td className="border border-border p-2">Consentement explicite</td>
                  <td className="border border-border p-2">Durée du dossier patient</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">Gestion des rendez-vous</td>
                  <td className="border border-border p-2">Exécution du contrat</td>
                  <td className="border border-border p-2">3 ans après dernière interaction</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">Amélioration du service</td>
                  <td className="border border-border p-2">Intérêt légitime</td>
                  <td className="border border-border p-2">26 mois (analytics)</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">Sécurité et audit</td>
                  <td className="border border-border p-2">Obligation légale</td>
                  <td className="border border-border p-2">1 an (logs de connexion)</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">4. Destinataires des données</h2>
            <p>Les données sont accessibles uniquement aux personnes suivantes :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Praticiens et personnels de la structure de soins autorisés</li>
              <li>Prestataires techniques (hébergeur certifié HDS, services d'IA)</li>
              <li>Autorités compétentes sur réquisition légale</li>
            </ul>
            <p className="mt-4">
              <strong>Hébergement :</strong> Les données sont hébergées par un prestataire certifié 
              Hébergeur de Données de Santé (HDS) conformément à l'article L.1111-8 du Code de la santé publique.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">5. Transferts internationaux</h2>
            <p>
              Certains sous-traitants peuvent être situés hors de l'Union Européenne. Dans ce cas, 
              les transferts sont encadrés par :
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Clauses contractuelles types (CCT) de la Commission Européenne</li>
              <li>Décisions d'adéquation de la Commission Européenne</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">6. Vos droits</h2>
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
              <li><strong>Droit de rectification</strong> : corriger des données inexactes</li>
              <li><strong>Droit à l'effacement</strong> : demander la suppression de vos données (sous réserve des obligations légales de conservation)</li>
              <li><strong>Droit à la limitation</strong> : limiter le traitement de vos données</li>
              <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
              <li><strong>Droit d'opposition</strong> : vous opposer au traitement fondé sur l'intérêt légitime</li>
              <li><strong>Droit de retirer votre consentement</strong> : à tout moment pour les traitements basés sur le consentement</li>
            </ul>
            <p className="mt-4">
              Pour exercer ces droits, contactez notre DPO à l'adresse : <strong>dpo@omnisoin-assist.fr</strong>
            </p>
            <p className="mt-2">
              Vous pouvez également déposer une réclamation auprès de la CNIL : <a href="https://www.cnil.fr" className="text-primary hover:underline">www.cnil.fr</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">7. Sécurité des données</h2>
            <p>Nous mettons en œuvre les mesures suivantes pour protéger vos données :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Chiffrement des données en transit (TLS 1.3) et au repos (AES-256)</li>
              <li>Authentification forte des utilisateurs</li>
              <li>Contrôle d'accès basé sur les rôles (RBAC)</li>
              <li>Journalisation des accès aux données sensibles</li>
              <li>Sauvegardes régulières et plan de continuité</li>
              <li>Tests de sécurité réguliers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">8. Cookies</h2>
            <p>
              Nous utilisons des cookies pour le fonctionnement du service et l'analyse d'audience.
              Vous pouvez gérer vos préférences via notre bandeau de consentement.
            </p>
            <p className="mt-2">
              Pour plus d'informations, consultez notre <Link href="/legal" className="text-primary hover:underline">politique de cookies</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">9. Modifications</h2>
            <p>
              Cette politique peut être mise à jour. En cas de modification substantielle, 
              vous serez informé par email ou via une notification dans l'application.
            </p>
          </section>
        </div>
      </div>
      <LegalFooter />
    </div>
  );
}
