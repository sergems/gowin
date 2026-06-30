import { Link } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

const YEAR = new Date().getFullYear();

export default function PrivacyPolicy() {
  const { language, t } = useSiteSettings();
  const fr = language === "fr";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border bg-card/60 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">
              {fr ? "Politique de confidentialité" : "Privacy Policy"}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            {fr ? `Dernière mise à jour : 1er janvier ${YEAR}` : `Last updated: January 1, ${YEAR}`}
          </p>
          <h2 className="text-3xl font-black tracking-tight mb-4">
            {fr ? "Votre vie privée compte" : "Your Privacy Matters"}
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {fr
              ? "GoWin Sportsbook (« GoWin », « nous ») s'engage à protéger vos informations personnelles. Cette Politique de confidentialité explique les données que nous collectons, comment nous les utilisons et vos droits à cet égard. En utilisant notre plateforme, vous acceptez les pratiques décrites ici."
              : `GoWin Sportsbook ("GoWin", "we", "us", or "our") is committed to protecting your personal information. This Privacy Policy explains what data we collect, how we use it, and your rights with respect to that data. By using our platform, you agree to the practices described here.`}
          </p>
        </div>

        <Section title={fr ? "1. Informations que nous collectons" : "1. Information We Collect"}>
          {fr ? (
            <>
              <p>Nous collectons les catégories suivantes de données personnelles :</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
                <li><strong className="text-foreground">Informations de compte</strong> — nom, nom d'utilisateur, adresse e-mail, numéro de téléphone et date de naissance.</li>
                <li><strong className="text-foreground">Vérification d'identité</strong> — documents d'identité officiels lorsque requis par la réglementation.</li>
                <li><strong className="text-foreground">Informations financières</strong> — numéros Mobile Money, historique des transactions, enregistrements de dépôts et retraits.</li>
                <li><strong className="text-foreground">Données d'utilisation</strong> — historique des paris, journaux de session, type de navigateur, adresse IP et identifiants d'appareils.</li>
                <li><strong className="text-foreground">Communications</strong> — messages envoyés à notre équipe d'assistance.</li>
              </ul>
            </>
          ) : (
            <>
              <p>We collect the following categories of personal data:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
                <li><strong className="text-foreground">Account information</strong> — name, username, email address, phone number, and date of birth.</li>
                <li><strong className="text-foreground">Identity verification</strong> — government-issued ID documents where required by regulation.</li>
                <li><strong className="text-foreground">Financial information</strong> — mobile money numbers, transaction history, deposit and withdrawal records.</li>
                <li><strong className="text-foreground">Usage data</strong> — betting history, session logs, browser type, IP address, and device identifiers.</li>
                <li><strong className="text-foreground">Communications</strong> — messages you send to our support team.</li>
              </ul>
            </>
          )}
        </Section>

        <Section title={fr ? "2. Utilisation de vos informations" : "2. How We Use Your Information"}>
          {fr ? (
            <>
              <p>Nous utilisons vos données personnelles pour :</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
                <li>Créer et gérer votre compte.</li>
                <li>Traiter les dépôts, retraits et paris.</li>
                <li>Vérifier votre identité et votre âge conformément aux réglementations applicables.</li>
                <li>Détecter et prévenir la fraude, le blanchiment d'argent et autres activités illicites.</li>
                <li>Vous envoyer des notifications liées à votre compte et, avec votre consentement, des communications promotionnelles.</li>
                <li>Améliorer les performances, la sécurité et l'expérience utilisateur de la plateforme.</li>
                <li>Respecter nos obligations légales et réglementaires.</li>
              </ul>
            </>
          ) : (
            <>
              <p>We use your personal data to:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
                <li>Create and maintain your account.</li>
                <li>Process deposits, withdrawals, and bets.</li>
                <li>Verify your identity and age in compliance with applicable gambling regulations.</li>
                <li>Detect and prevent fraud, money laundering, and other illegal activities.</li>
                <li>Send you account-related notifications and, with your consent, promotional communications.</li>
                <li>Improve platform performance, security, and user experience.</li>
                <li>Comply with our legal and regulatory obligations.</li>
              </ul>
            </>
          )}
        </Section>

        <Section title={fr ? "3. Base juridique du traitement" : "3. Legal Basis for Processing"}>
          <p className="text-muted-foreground leading-relaxed">
            {fr
              ? "Nous traitons vos données sur une ou plusieurs des bases juridiques suivantes : (a) exécution d'un contrat — pour gérer votre compte et traiter les transactions ; (b) obligation légale — pour satisfaire aux exigences réglementaires incluant les règles LCB et KYC ; (c) intérêt légitime — pour protéger la sécurité de notre plateforme ; et (d) consentement — pour les communications marketing, que vous pouvez retirer à tout moment."
              : "We process your data on one or more of the following legal bases: (a) performance of a contract — to operate your account and process transactions; (b) legal obligation — to meet regulatory requirements including anti-money laundering (AML) and know-your-customer (KYC) rules; (c) legitimate interest — to protect the security of our platform; and (d) consent — for marketing communications, which you may withdraw at any time."}
          </p>
        </Section>

        <Section title={fr ? "4. Partage de vos informations" : "4. Sharing Your Information"}>
          {fr ? (
            <>
              <p className="text-muted-foreground leading-relaxed mb-3">Nous ne vendons pas vos données personnelles. Nous pouvons les partager avec :</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong className="text-foreground">Prestataires de paiement</strong> — pour effectuer des transactions financières (ex. : PawaPay Mobile Money).</li>
                <li><strong className="text-foreground">Autorités réglementaires</strong> — lorsque requis par la loi ou les conditions de licence.</li>
                <li><strong className="text-foreground">Fournisseurs de services</strong> — des tiers de confiance qui nous aident à exploiter la plateforme, liés par des obligations de confidentialité.</li>
                <li><strong className="text-foreground">Forces de l'ordre</strong> — sur demande légale valide.</li>
              </ul>
            </>
          ) : (
            <>
              <p className="text-muted-foreground leading-relaxed mb-3">We do not sell your personal data. We may share it with:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong className="text-foreground">Payment processors</strong> — to complete financial transactions (e.g., PawaPay mobile money).</li>
                <li><strong className="text-foreground">Regulatory authorities</strong> — where required by law or licensing conditions.</li>
                <li><strong className="text-foreground">Service providers</strong> — trusted third parties who help us operate the platform, bound by confidentiality obligations.</li>
                <li><strong className="text-foreground">Law enforcement</strong> — when required by valid legal process.</li>
              </ul>
            </>
          )}
        </Section>

        <Section title={fr ? "5. Conservation des données" : "5. Data Retention"}>
          <p className="text-muted-foreground leading-relaxed">
            {fr
              ? "Nous conservons vos données personnelles aussi longtemps que votre compte est actif et pendant une durée minimale de cinq (5) ans après la fermeture du compte, comme l'exigent les réglementations applicables. Les enregistrements des transactions peuvent être conservés plus longtemps si la loi l'exige."
              : "We retain your personal data for as long as your account is active and for a minimum of five (5) years after account closure, as required by applicable gambling and financial regulations. Transaction records may be retained for longer where mandated by law."}
          </p>
        </Section>

        <Section title={fr ? "6. Sécurité" : "6. Security"}>
          <p className="text-muted-foreground leading-relaxed">
            {fr
              ? "Nous mettons en œuvre des mesures techniques et organisationnelles conformes aux normes de l'industrie pour protéger vos données, notamment les connexions chiffrées (TLS), les mots de passe hachés, les contrôles d'accès et les audits de sécurité réguliers. Aucun système n'est totalement sécurisé ; vous êtes responsable de la confidentialité de vos identifiants de compte."
              : "We implement industry-standard technical and organisational measures to protect your data, including encrypted connections (TLS), hashed passwords, access controls, and regular security reviews. No system is completely secure; you are responsible for maintaining the confidentiality of your account credentials."}
          </p>
        </Section>

        <Section title={fr ? "7. Vos droits" : "7. Your Rights"}>
          {fr ? (
            <>
              <p>Selon votre juridiction, vous pouvez avoir le droit de :</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
                <li>Accéder aux données personnelles que nous détenons à votre sujet.</li>
                <li>Corriger des données inexactes.</li>
                <li>Demander la suppression de vos données (sous réserve des exigences légales de conservation).</li>
                <li>Vous opposer à ou restreindre certains traitements.</li>
                <li>Retirer votre consentement lorsque le traitement est basé sur le consentement.</li>
              </ul>
              <p className="text-muted-foreground mt-3">Pour exercer l'un de ces droits, contactez-nous à <strong className="text-foreground">support@gowin.com</strong>.</p>
            </>
          ) : (
            <>
              <p>Depending on your jurisdiction, you may have the right to:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
                <li>Access the personal data we hold about you.</li>
                <li>Correct inaccurate data.</li>
                <li>Request deletion of your data (subject to legal retention requirements).</li>
                <li>Object to or restrict certain processing.</li>
                <li>Withdraw consent where processing is consent-based.</li>
              </ul>
              <p className="text-muted-foreground mt-3">To exercise any of these rights, contact us at <strong className="text-foreground">support@gowin.com</strong>.</p>
            </>
          )}
        </Section>

        <Section title={fr ? "8. Cookies" : "8. Cookies"}>
          <p className="text-muted-foreground leading-relaxed">
            {fr
              ? "Nous utilisons des cookies de session et des jetons de stockage local uniquement pour maintenir votre connexion et mémoriser vos préférences. Nous n'utilisons pas de cookies publicitaires tiers. Vous pouvez supprimer les cookies via les paramètres de votre navigateur, mais cela vous déconnectera de la plateforme."
              : "We use session cookies and local storage tokens solely to keep you logged in and to remember your preferences. We do not use third-party advertising cookies. You may clear cookies through your browser settings, but this will log you out of the platform."}
          </p>
        </Section>

        <Section title={fr ? "9. Jeu responsable" : "9. Responsible Gambling"}>
          <p className="text-muted-foreground leading-relaxed">
            {fr
              ? "GoWin peut utiliser les données d'activité de votre compte pour identifier des signes de jeu problématique et pour appliquer les auto-exclusions ou limites de dépôt que vous avez demandées. Ce traitement est dans l'intérêt de la protection des joueurs et est requis par notre licence d'exploitation."
              : "GoWin may use your account activity data to identify signs of problem gambling and to enforce self-exclusion or deposit limits you have requested. This processing is in the interest of player protection and is required by our operating licence."}
          </p>
        </Section>

        <Section title={fr ? "10. Modifications de cette politique" : "10. Changes to This Policy"}>
          <p className="text-muted-foreground leading-relaxed">
            {fr
              ? "Nous pouvons mettre à jour cette Politique de confidentialité de temps à autre. Dans ce cas, nous réviserons la date de « Dernière mise à jour » en haut et, pour les modifications importantes, vous en informerons par e-mail ou notification dans l'application. L'utilisation continue de la plateforme constitue une acceptation de la politique mise à jour."
              : `We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date at the top and, for material changes, notify you via email or an in-app notice. Continued use of the platform after changes constitutes acceptance of the updated policy.`}
          </p>
        </Section>

        <Section title={fr ? "11. Nous contacter" : "11. Contact Us"}>
          <p className="text-muted-foreground leading-relaxed">
            {fr
              ? "Pour toute question ou demande liée à la confidentialité, contactez notre équipe de protection des données à :"
              : "For privacy-related questions or requests, contact our Data Protection team at:"}
          </p>
          <div className="mt-3 p-4 rounded-lg bg-card border border-border text-sm text-muted-foreground space-y-1">
            <p><strong className="text-foreground">GoWin Sportsbook</strong></p>
            <p>Email: <strong className="text-foreground">privacy@gowin.com</strong></p>
            <p>Support: <strong className="text-foreground">support@gowin.com</strong></p>
          </div>
        </Section>

        <div className="border-t border-border pt-8 text-center text-xs text-muted-foreground/60 space-y-2">
          <p>© {YEAR} GoWin Sportsbook. {t("footer.rights")}</p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/terms" className="hover:text-foreground transition-colors">{t("footer.terms")}</Link>
            <span>·</span>
            <Link href="/" className="hover:text-foreground transition-colors">{t("footer.back_home")}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-lg font-bold text-foreground border-l-2 border-primary pl-3">{title}</h3>
      <div className="text-muted-foreground leading-relaxed pl-0">{children}</div>
    </section>
  );
}
