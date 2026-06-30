import { Link } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

const YEAR = new Date().getFullYear();

export default function TermsOfService() {
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
            <FileText className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">
              {fr ? "Conditions d'utilisation" : "Terms of Service"}
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
            {fr ? "Conditions d'utilisation" : "Terms of Service"}
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {fr
              ? `Les présentes Conditions d'utilisation (« Conditions ») régissent l'utilisation de la plateforme GoWin Sportsbook (« GoWin », « nous » ou « notre ») et constituent un accord juridiquement contraignant entre vous et GoWin. Veuillez les lire attentivement. En créant un compte ou en utilisant nos services, vous acceptez d'être lié par ces Conditions.`
              : `These Terms of Service ("Terms") govern your use of the GoWin Sportsbook platform ("GoWin", "we", "us", or "our") and constitute a legally binding agreement between you and GoWin. Please read them carefully. By creating an account or using our services, you agree to be bound by these Terms.`}
          </p>
        </div>

        <Section title={fr ? "1. Éligibilité" : "1. Eligibility"}>
          {fr ? (
            <>
              <p className="text-muted-foreground leading-relaxed">Pour utiliser GoWin, vous devez :</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
                <li>Être âgé d'au moins <strong className="text-foreground">18 ans</strong> (ou l'âge légal minimum de jeu dans votre juridiction, si celui-ci est plus élevé).</li>
                <li>Résider dans une juridiction où les paris sportifs en ligne sont légalement autorisés.</li>
                <li>Ne pas être auto-exclu ni interdit des services de jeux.</li>
                <li>Fournir des informations exactes et véridiques lors de l'inscription.</li>
              </ul>
              <p className="text-muted-foreground mt-3">GoWin se réserve le droit de demander une preuve d'identité et d'âge à tout moment. Les comptes ne respectant pas les conditions d'éligibilité seront suspendus et tout solde en attente sera traité conformément à la législation applicable.</p>
            </>
          ) : (
            <>
              <p className="text-muted-foreground leading-relaxed">To use GoWin, you must:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
                <li>Be at least <strong className="text-foreground">18 years of age</strong> (or the minimum legal gambling age in your jurisdiction, whichever is higher).</li>
                <li>Reside in a jurisdiction where online sports betting is legally permitted.</li>
                <li>Not be self-excluded or banned from gambling services.</li>
                <li>Provide accurate and truthful information when registering.</li>
              </ul>
              <p className="text-muted-foreground mt-3">GoWin reserves the right to request proof of identity and age at any time. Accounts found to be in violation of eligibility requirements will be suspended and any outstanding balances handled in accordance with applicable law.</p>
            </>
          )}
        </Section>

        <Section title={fr ? "2. Inscription et sécurité du compte" : "2. Account Registration & Security"}>
          <p className="text-muted-foreground leading-relaxed">
            {fr
              ? `Chaque utilisateur ne peut détenir qu'un seul compte. Vous êtes responsable de la confidentialité de votre mot de passe et de toutes les activités réalisées sous votre compte. Si vous suspectez un accès non autorisé, contactez-nous immédiatement à `
              : `Each user may hold only one account. You are responsible for maintaining the confidentiality of your password and for all activity that occurs under your account. If you suspect unauthorised access, contact us immediately at `}
            <strong className="text-foreground">support@gowin.com</strong>.{" "}
            {fr
              ? "GoWin ne pourra être tenu responsable des pertes résultant de votre manquement à sécuriser vos identifiants."
              : "GoWin will not be liable for losses resulting from your failure to secure your account credentials."}
          </p>
        </Section>

        <Section title={fr ? "3. Dépôts et retraits" : "3. Deposits & Withdrawals"}>
          {fr ? (
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Les montants minimums et maximums de dépôt/retrait sont définis par GoWin et affichés sur la page portefeuille.</li>
              <li>Les fonds déposés doivent provenir d'un mode de paiement vous appartenant.</li>
              <li>Les retraits sont traités vers le même mode de paiement utilisé pour le dernier dépôt, dans la mesure du possible.</li>
              <li>GoWin peut effectuer une vérification d'identité avant de traiter les retraits. Les délais varient selon le mode de paiement.</li>
              <li>Les dépôts sont crédités en temps réel lorsque le prestataire confirme la réception. GoWin n'est pas responsable des retards causés par des prestataires tiers.</li>
            </ul>
          ) : (
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Minimum and maximum deposit/withdrawal amounts are set by GoWin and displayed on the wallet page.</li>
              <li>Funds deposited must originate from a payment method owned by you.</li>
              <li>Withdrawals are processed to the same payment method used for the most recent deposit where possible.</li>
              <li>GoWin may perform identity verification before processing withdrawals. Processing times vary by payment method.</li>
              <li>Deposits are credited in real time where the payment provider confirms receipt. GoWin is not responsible for delays caused by third-party payment providers.</li>
            </ul>
          )}
        </Section>

        <Section title={fr ? "4. Règles des paris" : "4. Betting Rules"}>
          {fr ? (
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Les paris sont acceptés aux cotes affichées au moment de la mise. Les cotes peuvent changer avant confirmation.</li>
              <li>Une fois confirmés, les paris sont définitifs et ne peuvent être annulés ou modifiés par l'utilisateur.</li>
              <li>GoWin se réserve le droit d'annuler les paris sur des événements affectés par la corruption sportive, des erreurs de données ou des défaillances système.</li>
              <li>Le paiement maximum par ticket est déterminé par GoWin et affiché au moment de la mise.</li>
              <li>GoWin se réserve le droit de limiter les mises ou de restreindre l'accès à certains marchés pour tout utilisateur.</li>
              <li>Les gains seront crédités sur votre portefeuille après le règlement de l'événement.</li>
            </ul>
          ) : (
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Bets are accepted at the odds displayed at the time of placement. Odds are subject to change before confirmation.</li>
              <li>Once confirmed, bets are final and cannot be cancelled or amended by the user.</li>
              <li>GoWin reserves the right to void bets placed on events affected by match-fixing, data errors, or system faults.</li>
              <li>Maximum payout per bet slip is determined by GoWin and displayed at time of placement.</li>
              <li>GoWin reserves the right to limit stake amounts or restrict access to specific markets for any user at its sole discretion.</li>
              <li>Winnings will be credited to your wallet upon settlement of the event.</li>
            </ul>
          )}
        </Section>

        <Section title={fr ? "5. Jeu responsable" : "5. Responsible Gambling"}>
          {fr ? (
            <>
              <p className="text-muted-foreground leading-relaxed mb-3">GoWin s'engage en faveur du jeu responsable. Nous proposons des outils pour vous aider à rester maître de la situation :</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong className="text-foreground">Auto-exclusion</strong> — contactez le support pour suspendre votre compte pour une période définie ou indéfinie.</li>
                <li><strong className="text-foreground">Limites de dépôt</strong> — fixez des limites journalières, hebdomadaires ou mensuelles sur votre portefeuille.</li>
                <li><strong className="text-foreground">Périodes de refroidissement</strong> — limitez temporairement votre accès à la plateforme.</li>
              </ul>
              <p className="text-muted-foreground mt-3">Si vous pensez avoir un problème de jeu, veuillez demander de l'aide. Le jeu doit être un divertissement. S'il cesse d'être amusant, arrêtez de jouer.</p>
            </>
          ) : (
            <>
              <p className="text-muted-foreground leading-relaxed mb-3">GoWin is committed to responsible gambling. We provide tools to help you stay in control:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong className="text-foreground">Self-exclusion</strong> — contact support to suspend your account for a defined or indefinite period.</li>
                <li><strong className="text-foreground">Deposit limits</strong> — set daily, weekly, or monthly limits on your wallet.</li>
                <li><strong className="text-foreground">Cooling-off periods</strong> — temporarily restrict your access to the platform.</li>
              </ul>
              <p className="text-muted-foreground mt-3">If you believe you have a gambling problem, please seek help. Gambling should be entertaining. If it stops being fun, stop playing.</p>
            </>
          )}
        </Section>

        <Section title={fr ? "6. Bonus et promotions" : "6. Bonuses & Promotions"}>
          <p className="text-muted-foreground leading-relaxed">
            {fr
              ? "Tout bonus ou promotion offert par GoWin est soumis à ses propres conditions spécifiques, communiquées au moment de l'offre. GoWin se réserve le droit de modifier ou retirer toute promotion à tout moment. L'abus de bonus — notamment la création de comptes multiples et les paris assortis — peut entraîner la suspension du compte et la perte des fonds bonus."
              : "Any bonuses or promotions offered by GoWin are subject to their own specific terms and conditions, which will be communicated at the time of the offer. GoWin reserves the right to modify or withdraw any promotion at any time. Abuse of bonuses — including but not limited to multi-accounting and matched betting — may result in account suspension and forfeiture of bonus funds."}
          </p>
        </Section>

        <Section title={fr ? "7. Activités interdites" : "7. Prohibited Activities"}>
          {fr ? (
            <>
              <p>Les activités suivantes sont strictement interdites :</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
                <li>Créer plusieurs comptes.</li>
                <li>Utiliser des logiciels automatisés, des robots ou des scripts pour interagir avec la plateforme.</li>
                <li>Participer ou faciliter la corruption sportive, la fraude ou le blanchiment d'argent.</li>
                <li>Agir en collusion avec d'autres utilisateurs ou le personnel de GoWin pour obtenir un avantage déloyal.</li>
                <li>Exploiter des erreurs techniques ou des dysfonctionnements du système.</li>
                <li>Tenter d'accéder aux comptes ou aux données d'autres utilisateurs.</li>
              </ul>
              <p className="text-muted-foreground mt-3">La violation de ces interdictions peut entraîner la suspension immédiate du compte, la perte des fonds et un signalement aux autorités compétentes.</p>
            </>
          ) : (
            <>
              <p>The following activities are strictly prohibited:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
                <li>Creating multiple accounts.</li>
                <li>Using automated software, bots, or scripts to interact with the platform.</li>
                <li>Engaging in or facilitating match-fixing, fraud, or money laundering.</li>
                <li>Colluding with other users or GoWin staff to gain an unfair advantage.</li>
                <li>Exploiting technical errors or system glitches.</li>
                <li>Attempting to access accounts or data belonging to other users.</li>
              </ul>
              <p className="text-muted-foreground mt-3">Violation of these prohibitions may result in immediate account suspension, forfeiture of funds, and referral to law enforcement authorities.</p>
            </>
          )}
        </Section>

        <Section title={fr ? "8. Propriété intellectuelle" : "8. Intellectual Property"}>
          <p className="text-muted-foreground leading-relaxed">
            {fr
              ? "Tout le contenu de la plateforme GoWin — y compris les logos, graphiques, logiciels, données de cotes et textes — est la propriété de GoWin ou de ses concédants de licence et est protégé par la législation applicable. Vous ne pouvez pas reproduire, distribuer ou créer des œuvres dérivées sans notre consentement écrit exprès."
              : "All content on the GoWin platform — including logos, graphics, software, odds data, and text — is the property of GoWin or its licensors and is protected by applicable intellectual property law. You may not reproduce, distribute, or create derivative works without our express written consent."}
          </p>
        </Section>

        <Section title={fr ? "9. Limitation de responsabilité" : "9. Limitation of Liability"}>
          <p className="text-muted-foreground leading-relaxed">
            {fr
              ? "Dans toute la mesure permise par la loi, GoWin ne pourra être tenu responsable de dommages indirects, accessoires, spéciaux ou consécutifs découlant de votre utilisation de la plateforme, y compris la perte de profits ou de données. Notre responsabilité totale envers vous ne dépassera pas le montant déposé sur votre compte au cours des 30 jours précédant l'événement à l'origine de la réclamation."
              : "To the fullest extent permitted by law, GoWin shall not be liable for any indirect, incidental, special, or consequential damages arising out of your use of the platform, including loss of profits or data. Our total liability to you for any claim shall not exceed the amount deposited into your account in the 30 days preceding the event giving rise to the claim."}
          </p>
        </Section>

        <Section title={fr ? "10. Résiliation" : "10. Termination"}>
          <p className="text-muted-foreground leading-relaxed">
            {fr
              ? "GoWin peut suspendre ou résilier votre compte à tout moment en cas de violation de ces Conditions ou pour des raisons réglementaires, avec ou sans préavis. Vous pouvez fermer votre compte à tout moment en contactant le support. À la fermeture, tout solde restant vous sera remboursé via votre mode de paiement enregistré, sous réserve de vérification d'identité."
              : "GoWin may suspend or terminate your account at any time for breach of these Terms or for regulatory reasons, with or without prior notice. You may close your account at any time by contacting support. Upon closure, any remaining balance will be refunded to you via your registered payment method, subject to identity verification and applicable deductions."}
          </p>
        </Section>

        <Section title={fr ? "11. Modifications des présentes Conditions" : "11. Changes to These Terms"}>
          <p className="text-muted-foreground leading-relaxed">
            {fr
              ? "Nous pouvons mettre à jour ces Conditions de temps à autre. Les modifications importantes seront communiquées par e-mail ou notification dans l'application au moins 14 jours avant leur entrée en vigueur. L'utilisation continue de la plateforme constitue une acceptation des Conditions révisées."
              : "We may update these Terms from time to time. Material changes will be communicated via email or in-app notification at least 14 days before they take effect. Continued use of the platform after the effective date constitutes acceptance of the revised Terms."}
          </p>
        </Section>

        <Section title={fr ? "12. Droit applicable" : "12. Governing Law"}>
          <p className="text-muted-foreground leading-relaxed">
            {fr
              ? "Ces Conditions sont régies et interprétées conformément aux lois de la juridiction dans laquelle GoWin détient sa licence d'exploitation. Tout litige sera soumis à la compétence exclusive des tribunaux de cette juridiction."
              : "These Terms are governed by and construed in accordance with the laws of the jurisdiction in which GoWin holds its operating licence. Any disputes shall be subject to the exclusive jurisdiction of the courts of that jurisdiction."}
          </p>
        </Section>

        <Section title={fr ? "13. Contact" : "13. Contact"}>
          <p className="text-muted-foreground leading-relaxed">
            {fr ? "Pour toute question concernant ces Conditions, contactez-nous à :" : "For questions about these Terms, contact us at:"}
          </p>
          <div className="mt-3 p-4 rounded-lg bg-card border border-border text-sm text-muted-foreground space-y-1">
            <p><strong className="text-foreground">GoWin Sportsbook</strong></p>
            <p>Email: <strong className="text-foreground">support@gowin.com</strong></p>
            <p>{fr ? "Juridique" : "Legal"}: <strong className="text-foreground">legal@gowin.com</strong></p>
          </div>
        </Section>

        <div className="border-t border-border pt-8 text-center text-xs text-muted-foreground/60 space-y-2">
          <p>© {YEAR} GoWin Sportsbook. {t("footer.rights")}</p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">{t("footer.privacy")}</Link>
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
