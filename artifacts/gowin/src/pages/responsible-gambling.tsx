import { Link } from "wouter";
import { ArrowLeft, ShieldCheck, AlertTriangle, Phone, Eye, Lock, UserX, Baby } from "lucide-react";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

const YEAR = new Date().getFullYear();

export default function ResponsibleGambling() {
  const { language, t } = useSiteSettings();
  const fr = language === "fr";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card/60 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">
              {fr ? "Jeu Responsable" : "Responsible Gambling"}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">

        {/* Intro */}
        <div>
          <h2 className="text-3xl font-black tracking-tight mb-4">
            {fr ? "Jeu Responsable" : "Responsible Gambling"}
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {fr
              ? "Go Win RDC s'engage à offrir un environnement de jeu sûr, équitable et responsable. Les paris doivent rester un loisir agréable. Nous mettons à votre disposition des outils et des ressources pour vous aider à garder le contrôle."
              : "Go Win RDC is committed to providing a safe, fair, and responsible gaming environment. Betting should always remain an enjoyable leisure activity. We provide you with tools and resources to help you stay in control."}
          </p>
        </div>

        {/* 1. Worried */}
        <Block icon={<AlertTriangle className="w-5 h-5 text-yellow-500" />}
          title={fr ? "Vous vous inquiétez de votre façon de jouer ?" : "Worried about how much you gamble?"}>
          {fr ? (
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Si vous pensez que votre comportement de jeu pourrait vous causer des difficultés — financières, émotionnelles ou relationnelles — vous n'êtes pas seul. Reconnaître le problème est la première étape vers le changement.
              </p>
              <p>
                Posez-vous les questions suivantes :
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Est-ce que je parie plus que ce que je peux me permettre de perdre ?</li>
                <li>Est-ce que j'emprunte de l'argent pour jouer ?</li>
                <li>Est-ce que le jeu empiète sur mon travail, ma famille ou mes responsabilités ?</li>
                <li>Est-ce que je ressens le besoin de récupérer mes pertes en pariant encore plus ?</li>
                <li>Est-ce que je dissimule mes habitudes de jeu à mes proches ?</li>
              </ul>
              <p>
                Si vous avez répondu oui à l'une de ces questions, nous vous encourageons vivement à utiliser nos outils de contrôle ou à contacter un service d'aide professionnel.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                If you think your gambling behaviour might be causing you difficulties — financial, emotional, or personal — you are not alone. Recognising the issue is the first step toward change.
              </p>
              <p>
                Ask yourself the following questions:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Am I betting more than I can afford to lose?</li>
                <li>Am I borrowing money to gamble?</li>
                <li>Is gambling interfering with my work, family, or responsibilities?</li>
                <li>Do I feel compelled to chase my losses by betting even more?</li>
                <li>Am I hiding my gambling habits from people close to me?</li>
              </ul>
              <p>
                If you answered yes to any of these questions, we strongly encourage you to use our control tools or contact a professional support service.
              </p>
            </div>
          )}
        </Block>

        {/* 2. Maintaining control */}
        <Block icon={<Lock className="w-5 h-5 text-primary" />}
          title={fr ? "Garder le contrôle" : "Maintaining control"}>
          {fr ? (
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Le jeu responsable commence par des décisions conscientes. Voici quelques principes simples pour rester maître de votre expérience :
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li><strong className="text-foreground">Fixez un budget.</strong> Décidez à l'avance combien vous êtes prêt à dépenser et ne dépassez jamais ce montant.</li>
                <li><strong className="text-foreground">Ne pariez pas pour récupérer des pertes.</strong> Les pertes font partie du jeu — essayer de les récupérer mène souvent à des pertes encore plus importantes.</li>
                <li><strong className="text-foreground">Ne pariez jamais sous l'influence.</strong> L'alcool ou d'autres substances altèrent le jugement et peuvent conduire à des décisions impulsives.</li>
                <li><strong className="text-foreground">Faites des pauses régulières.</strong> Accordez-vous des jours sans jeu pour maintenir une perspective saine.</li>
                <li><strong className="text-foreground">Jouez pour le plaisir, pas pour gagner de l'argent.</strong> Considérez le jeu comme un divertissement, pas comme une source de revenus.</li>
                <li><strong className="text-foreground">Ne pariez jamais avec de l'argent destiné à vos dépenses essentielles</strong> (loyer, nourriture, factures).</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Responsible gambling starts with conscious decisions. Here are some simple principles to help you stay in control:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li><strong className="text-foreground">Set a budget.</strong> Decide in advance how much you are prepared to spend and never exceed that amount.</li>
                <li><strong className="text-foreground">Never chase losses.</strong> Losses are part of gambling — trying to win them back often leads to even greater losses.</li>
                <li><strong className="text-foreground">Never bet under the influence.</strong> Alcohol or other substances impair judgement and can lead to impulsive decisions.</li>
                <li><strong className="text-foreground">Take regular breaks.</strong> Give yourself days off from gambling to maintain a healthy perspective.</li>
                <li><strong className="text-foreground">Gamble for fun, not to make money.</strong> Treat betting as entertainment, not as a source of income.</li>
                <li><strong className="text-foreground">Never bet money needed for essential expenses</strong> (rent, food, bills).</li>
              </ul>
            </div>
          )}
        </Block>

        {/* 3. Monitor */}
        <Block icon={<Eye className="w-5 h-5 text-blue-400" />}
          title={fr ? "Surveiller votre activité de jeu" : "Monitor your betting activity"}>
          {fr ? (
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Go Win RDC vous offre la possibilité de consulter votre historique de paris et de transactions à tout moment depuis votre compte. Utiliser cette fonctionnalité régulièrement vous aide à :
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Garder une vue claire de vos dépenses totales sur n'importe quelle période.</li>
                <li>Identifier les tendances dans votre comportement de jeu.</li>
                <li>Comparer vos mises réelles avec votre budget prévu.</li>
              </ul>
              <p>
                Si vous constatez que vos dépenses dépassent régulièrement votre budget, c'est le moment d'agir. Utilisez les outils de limitation mis à votre disposition ou contactez notre équipe de support.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Go Win RDC gives you the ability to view your full bet history and transactions at any time from your account. Using this feature regularly helps you to:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Keep a clear view of your total spending over any period.</li>
                <li>Identify patterns in your gambling behaviour.</li>
                <li>Compare your actual stakes against your planned budget.</li>
              </ul>
              <p>
                If you find that your spending consistently exceeds your budget, it is time to act. Use the limitation tools available to you or contact our support team.
              </p>
            </div>
          )}
        </Block>

        {/* 4. Warning signs */}
        <Block icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
          title={fr ? "Signes d'alerte" : "Warning signs"}>
          {fr ? (
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Il peut être difficile de reconnaître un problème de jeu chez soi ou chez un proche. Voici les signaux d'alerte les plus courants :
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Penser constamment aux paris, même au travail ou en famille",
                  "Augmenter progressivement les mises pour ressentir les mêmes sensations",
                  "Devenir irritable ou anxieux lorsqu'on ne peut pas jouer",
                  "Mentir à ses proches sur ses habitudes de jeu",
                  "Utiliser le jeu pour fuir les problèmes ou les émotions difficiles",
                  "Négliger ses responsabilités professionnelles ou familiales à cause du jeu",
                  "Jouer avec de l'argent destiné aux besoins essentiels",
                  "Contracter des dettes pour financer le jeu",
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <span className="text-red-500 mt-0.5 shrink-0">⚠</span>
                    <span className="text-sm">{s}</span>
                  </div>
                ))}
              </div>
              <p>
                Si vous reconnaissez plusieurs de ces signes, ne tardez pas à demander de l'aide. Un professionnel peut vous accompagner sans jugement.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                It can be difficult to recognise a gambling problem in yourself or in someone close to you. Here are the most common warning signs:
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Constantly thinking about betting, even at work or with family",
                  "Gradually increasing stakes to feel the same level of excitement",
                  "Becoming irritable or anxious when unable to gamble",
                  "Lying to loved ones about gambling habits",
                  "Using gambling to escape problems or difficult emotions",
                  "Neglecting work or family responsibilities because of gambling",
                  "Gambling with money intended for essential needs",
                  "Taking on debt to fund gambling",
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <span className="text-red-500 mt-0.5 shrink-0">⚠</span>
                    <span className="text-sm">{s}</span>
                  </div>
                ))}
              </div>
              <p>
                If you recognise several of these signs, do not delay seeking help. A professional can support you without judgement.
              </p>
            </div>
          )}
        </Block>

        {/* 5. Self-exclusion intro */}
        <Block icon={<UserX className="w-5 h-5 text-primary" />}
          title={fr ? "Auto-exclusion" : "Self-exclusion"}>
          {fr ? (
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                L'auto-exclusion est un outil puissant qui vous permet de prendre du recul par rapport au jeu pendant une période définie. Go Win RDC vous soutient dans cette démarche.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Self-exclusion is a powerful tool that allows you to step back from gambling for a defined period. Go Win RDC supports you fully in this process.
              </p>
            </div>
          )}
        </Block>

        {/* 6. What is self-exclusion */}
        <Block icon={<UserX className="w-5 h-5 text-primary" />}
          title={fr ? "Qu'est-ce que l'auto-exclusion ?" : "What is self-exclusion?"}>
          {fr ? (
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                L'auto-exclusion est une mesure par laquelle vous demandez volontairement à Go Win RDC de bloquer l'accès à votre compte pour une durée déterminée. Pendant cette période :
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Votre compte est suspendu et vous ne pouvez plus placer de paris.</li>
                <li>Vous ne recevrez plus de communications promotionnelles de notre part.</li>
                <li>Votre solde disponible vous sera remboursé conformément à notre politique.</li>
              </ul>
              <p>
                L'auto-exclusion est une décision sérieuse et elle ne peut pas être annulée avant la fin de la période choisie.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Self-exclusion is a measure by which you voluntarily ask Go Win RDC to block access to your account for a set period. During this period:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Your account is suspended and you can no longer place bets.</li>
                <li>You will no longer receive promotional communications from us.</li>
                <li>Your available balance will be returned to you in accordance with our policy.</li>
              </ul>
              <p>
                Self-exclusion is a serious decision and cannot be reversed before the chosen period ends.
              </p>
            </div>
          )}
        </Block>

        {/* 7. Want to self-exclude */}
        <Block icon={<UserX className="w-5 h-5 text-primary" />}
          title={fr ? "Vous souhaitez vous auto-exclure ?" : "Want to self-exclude?"}>
          {fr ? (
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Pour demander une auto-exclusion, contactez notre équipe de support par l'un des moyens suivants :
              </p>
              <div className="p-4 rounded-lg bg-card border border-border space-y-2 text-sm">
                <p><strong className="text-foreground">Email :</strong> support@gowinrdc.com</p>
                <p><strong className="text-foreground">Depuis votre compte :</strong> Profil → Paramètres → Demander une auto-exclusion</p>
              </div>
              <p>
                Votre demande sera traitée dans les plus brefs délais. Nous vous confirmerons l'activation par email.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                To request self-exclusion, contact our support team via one of the following:
              </p>
              <div className="p-4 rounded-lg bg-card border border-border space-y-2 text-sm">
                <p><strong className="text-foreground">Email:</strong> support@gowinrdc.com</p>
                <p><strong className="text-foreground">From your account:</strong> Profile → Settings → Request Self-Exclusion</p>
              </div>
              <p>
                Your request will be processed as quickly as possible. We will confirm activation by email.
              </p>
            </div>
          )}
        </Block>

        {/* 8. Why self-exclude */}
        <Block icon={<ShieldCheck className="w-5 h-5 text-green-500" />}
          title={fr ? "Pourquoi s'auto-exclure ?" : "Why self-exclude?"}>
          {fr ? (
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                L'auto-exclusion vous donne le temps et l'espace nécessaires pour reprendre le contrôle sans avoir à résister constamment à la tentation de jouer. C'est une décision courageuse, pas une faiblesse.
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Elle protège vos finances en empêchant tout accès au compte pendant la période choisie.</li>
                <li>Elle vous permet de chercher de l'aide professionnelle sans distraction.</li>
                <li>Elle soulage la pression sur vos proches et améliore vos relations.</li>
                <li>Elle vous offre un nouveau départ avec de meilleures habitudes.</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Self-exclusion gives you the time and space needed to regain control without having to constantly resist the urge to gamble. It is a courageous decision, not a sign of weakness.
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>It protects your finances by preventing any account access during the chosen period.</li>
                <li>It allows you to seek professional help without distraction.</li>
                <li>It relieves pressure on your loved ones and improves relationships.</li>
                <li>It offers you a fresh start with healthier habits.</li>
              </ul>
            </div>
          )}
        </Block>

        {/* 9. Underage gambling */}
        <Block icon={<Baby className="w-5 h-5 text-orange-400" />}
          title={fr ? "Prévention du Jeu chez les Mineurs" : "Preventing Underage Gambling"}>
          {fr ? (
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                <strong className="text-foreground">Le jeu est strictement interdit aux personnes de moins de 18 ans.</strong> Go Win RDC prend cette obligation très au sérieux et applique des mesures de vérification d'âge lors de l'inscription et à tout moment à la demande.
              </p>
              <p>
                Si vous avez des enfants ou des jeunes à votre charge, voici quelques mesures que vous pouvez prendre pour les protéger :
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>Ne laissez jamais votre compte Go Win RDC ouvert sur un appareil partagé.</li>
                <li>Utilisez un mot de passe fort et ne le divulguez à personne.</li>
                <li>Activez le contrôle parental sur les appareils utilisés par des mineurs.</li>
                <li>Parlez ouvertement des risques liés au jeu avec les jeunes de votre entourage.</li>
              </ul>
              <p>
                Si vous suspectez qu'un mineur utilise votre compte ou un autre compte sur notre plateforme, signalez-le immédiatement à notre équipe de support à <strong className="text-foreground">support@gowinrdc.com</strong>.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                <strong className="text-foreground">Gambling is strictly prohibited for anyone under 18 years of age.</strong> Go Win RDC takes this obligation very seriously and applies age verification measures during registration and at any time upon request.
              </p>
              <p>
                If you have children or young people in your care, here are steps you can take to protect them:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>Never leave your Go Win RDC account open on a shared device.</li>
                <li>Use a strong password and never share it with anyone.</li>
                <li>Enable parental controls on devices used by minors.</li>
                <li>Talk openly with young people about the risks associated with gambling.</li>
              </ul>
              <p>
                If you suspect a minor is using your account or any other account on our platform, report it immediately to our support team at <strong className="text-foreground">support@gowinrdc.com</strong>.
              </p>
            </div>
          )}
        </Block>

        {/* Help banner */}
        <div className="rounded-xl bg-primary/10 border border-primary/30 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Phone className="w-6 h-6 text-primary shrink-0" />
            <h3 className="text-lg font-bold text-foreground">
              {fr ? "Besoin d'aide ? Vous n'êtes pas seul." : "Need help? You are not alone."}
            </h3>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {fr
              ? "Si vous ou quelqu'un que vous connaissez avez besoin d'aide concernant le jeu, n'hésitez pas à contacter un professionnel de santé mentale ou une ligne d'assistance dédiée. Parler à quelqu'un est toujours la bonne décision."
              : "If you or someone you know needs help regarding gambling, do not hesitate to contact a mental health professional or a dedicated helpline. Reaching out is always the right decision."}
          </p>
          <div className="pt-1 text-sm text-muted-foreground space-y-1">
            <p><strong className="text-foreground">Go Win RDC Support :</strong> support@gowinrdc.com</p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border pt-8 text-center text-xs text-muted-foreground/60 space-y-2">
          <p>© {YEAR} Go Win RDC. {t("footer.rights")}</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/privacy" className="hover:text-foreground transition-colors">{t("footer.privacy")}</Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-foreground transition-colors">{t("footer.terms")}</Link>
            <span>·</span>
            <Link href="/betting-rules" className="hover:text-foreground transition-colors">{t("footer.betting_rules")}</Link>
            <span>·</span>
            <Link href="/" className="hover:text-foreground transition-colors">{t("footer.back_home")}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Block({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 border-l-4 border-primary pl-4 py-1">
        {icon}
        <h2 className="text-xl font-black text-foreground">{title}</h2>
      </div>
      <div className="pl-1">{children}</div>
    </section>
  );
}
