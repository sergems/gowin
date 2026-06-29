import { Link } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";

const YEAR = new Date().getFullYear();

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card/60 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">Terms of Service</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        {/* Intro */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">Last updated: January 1, {YEAR}</p>
          <h2 className="text-3xl font-black tracking-tight mb-4">Terms of Service</h2>
          <p className="text-muted-foreground leading-relaxed">
            These Terms of Service ("Terms") govern your use of the GoWin Sportsbook platform ("GoWin", "we", "us",
            or "our") and constitute a legally binding agreement between you and GoWin. Please read them carefully.
            By creating an account or using our services, you agree to be bound by these Terms.
          </p>
        </div>

        <Section title="1. Eligibility">
          <p className="text-muted-foreground leading-relaxed">
            To use GoWin, you must:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
            <li>Be at least <strong className="text-foreground">18 years of age</strong> (or the minimum legal gambling age in your jurisdiction, whichever is higher).</li>
            <li>Reside in a jurisdiction where online sports betting is legally permitted.</li>
            <li>Not be self-excluded or banned from gambling services.</li>
            <li>Provide accurate and truthful information when registering.</li>
          </ul>
          <p className="text-muted-foreground mt-3">
            GoWin reserves the right to request proof of identity and age at any time. Accounts found to be in
            violation of eligibility requirements will be suspended and any outstanding balances handled in
            accordance with applicable law.
          </p>
        </Section>

        <Section title="2. Account Registration & Security">
          <p className="text-muted-foreground leading-relaxed">
            Each user may hold only one account. You are responsible for maintaining the confidentiality of your
            password and for all activity that occurs under your account. If you suspect unauthorised access, contact
            us immediately at <strong className="text-foreground">support@gowin.com</strong>. GoWin will not be
            liable for losses resulting from your failure to secure your account credentials.
          </p>
        </Section>

        <Section title="3. Deposits & Withdrawals">
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Minimum and maximum deposit/withdrawal amounts are set by GoWin and displayed on the wallet page.</li>
            <li>Funds deposited must originate from a payment method owned by you.</li>
            <li>Withdrawals are processed to the same payment method used for the most recent deposit where possible.</li>
            <li>GoWin may perform identity verification before processing withdrawals. Processing times vary by payment method.</li>
            <li>Deposits are credited in real time where the payment provider confirms receipt. GoWin is not responsible for delays caused by third-party payment providers.</li>
          </ul>
        </Section>

        <Section title="4. Betting Rules">
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Bets are accepted at the odds displayed at the time of placement. Odds are subject to change before confirmation.</li>
            <li>Once confirmed, bets are final and cannot be cancelled or amended by the user.</li>
            <li>GoWin reserves the right to void bets placed on events affected by match-fixing, data errors, or system faults.</li>
            <li>Maximum payout per bet slip is determined by GoWin and displayed at time of placement.</li>
            <li>GoWin reserves the right to limit stake amounts or restrict access to specific markets for any user at its sole discretion.</li>
            <li>Winnings will be credited to your wallet upon settlement of the event.</li>
          </ul>
        </Section>

        <Section title="5. Responsible Gambling">
          <p className="text-muted-foreground leading-relaxed mb-3">
            GoWin is committed to responsible gambling. We provide tools to help you stay in control:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li><strong className="text-foreground">Self-exclusion</strong> — contact support to suspend your account for a defined or indefinite period.</li>
            <li><strong className="text-foreground">Deposit limits</strong> — set daily, weekly, or monthly limits on your wallet.</li>
            <li><strong className="text-foreground">Cooling-off periods</strong> — temporarily restrict your access to the platform.</li>
          </ul>
          <p className="text-muted-foreground mt-3">
            If you believe you have a gambling problem, please seek help. Gambling should be entertaining. If it stops
            being fun, stop playing.
          </p>
        </Section>

        <Section title="6. Bonuses & Promotions">
          <p className="text-muted-foreground leading-relaxed">
            Any bonuses or promotions offered by GoWin are subject to their own specific terms and conditions, which
            will be communicated at the time of the offer. GoWin reserves the right to modify or withdraw any
            promotion at any time. Abuse of bonuses — including but not limited to multi-accounting and matched
            betting — may result in account suspension and forfeiture of bonus funds.
          </p>
        </Section>

        <Section title="7. Prohibited Activities">
          <p>The following activities are strictly prohibited:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
            <li>Creating multiple accounts.</li>
            <li>Using automated software, bots, or scripts to interact with the platform.</li>
            <li>Engaging in or facilitating match-fixing, fraud, or money laundering.</li>
            <li>Colluding with other users or GoWin staff to gain an unfair advantage.</li>
            <li>Exploiting technical errors or system glitches.</li>
            <li>Attempting to access accounts or data belonging to other users.</li>
          </ul>
          <p className="text-muted-foreground mt-3">
            Violation of these prohibitions may result in immediate account suspension, forfeiture of funds, and
            referral to law enforcement authorities.
          </p>
        </Section>

        <Section title="8. Intellectual Property">
          <p className="text-muted-foreground leading-relaxed">
            All content on the GoWin platform — including logos, graphics, software, odds data, and text — is the
            property of GoWin or its licensors and is protected by applicable intellectual property law. You may not
            reproduce, distribute, or create derivative works without our express written consent.
          </p>
        </Section>

        <Section title="9. Limitation of Liability">
          <p className="text-muted-foreground leading-relaxed">
            To the fullest extent permitted by law, GoWin shall not be liable for any indirect, incidental, special,
            or consequential damages arising out of your use of the platform, including loss of profits or data.
            Our total liability to you for any claim shall not exceed the amount deposited into your account in the
            30 days preceding the event giving rise to the claim.
          </p>
        </Section>

        <Section title="10. Termination">
          <p className="text-muted-foreground leading-relaxed">
            GoWin may suspend or terminate your account at any time for breach of these Terms or for regulatory
            reasons, with or without prior notice. You may close your account at any time by contacting support.
            Upon closure, any remaining balance will be refunded to you via your registered payment method, subject
            to identity verification and applicable deductions.
          </p>
        </Section>

        <Section title="11. Changes to These Terms">
          <p className="text-muted-foreground leading-relaxed">
            We may update these Terms from time to time. Material changes will be communicated via email or
            in-app notification at least 14 days before they take effect. Continued use of the platform after
            the effective date constitutes acceptance of the revised Terms.
          </p>
        </Section>

        <Section title="12. Governing Law">
          <p className="text-muted-foreground leading-relaxed">
            These Terms are governed by and construed in accordance with the laws of the jurisdiction in which
            GoWin holds its operating licence. Any disputes shall be subject to the exclusive jurisdiction of the
            courts of that jurisdiction.
          </p>
        </Section>

        <Section title="13. Contact">
          <p className="text-muted-foreground leading-relaxed">
            For questions about these Terms, contact us at:
          </p>
          <div className="mt-3 p-4 rounded-lg bg-card border border-border text-sm text-muted-foreground space-y-1">
            <p><strong className="text-foreground">GoWin Sportsbook</strong></p>
            <p>Email: <strong className="text-foreground">support@gowin.com</strong></p>
            <p>Legal: <strong className="text-foreground">legal@gowin.com</strong></p>
          </div>
        </Section>

        {/* Footer */}
        <div className="border-t border-border pt-8 text-center text-xs text-muted-foreground/60 space-y-2">
          <p>© {YEAR} GoWin Sportsbook. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <span>·</span>
            <Link href="/" className="hover:text-foreground transition-colors">Back to Home</Link>
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
