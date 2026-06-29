import { Link } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";

const YEAR = new Date().getFullYear();

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card/60 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">Privacy Policy</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        {/* Intro */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">Last updated: January 1, {YEAR}</p>
          <h2 className="text-3xl font-black tracking-tight mb-4">Your Privacy Matters</h2>
          <p className="text-muted-foreground leading-relaxed">
            GoWin Sportsbook ("GoWin", "we", "us", or "our") is committed to protecting your personal information. This
            Privacy Policy explains what data we collect, how we use it, and your rights with respect to that data.
            By using our platform, you agree to the practices described here.
          </p>
        </div>

        <Section title="1. Information We Collect">
          <p>We collect the following categories of personal data:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
            <li><strong className="text-foreground">Account information</strong> — name, username, email address, phone number, and date of birth.</li>
            <li><strong className="text-foreground">Identity verification</strong> — government-issued ID documents where required by regulation.</li>
            <li><strong className="text-foreground">Financial information</strong> — mobile money numbers, transaction history, deposit and withdrawal records.</li>
            <li><strong className="text-foreground">Usage data</strong> — betting history, session logs, browser type, IP address, and device identifiers.</li>
            <li><strong className="text-foreground">Communications</strong> — messages you send to our support team.</li>
          </ul>
        </Section>

        <Section title="2. How We Use Your Information">
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
        </Section>

        <Section title="3. Legal Basis for Processing">
          <p className="text-muted-foreground leading-relaxed">
            We process your data on one or more of the following legal bases: (a) performance of a contract — to
            operate your account and process transactions; (b) legal obligation — to meet regulatory requirements
            including anti-money laundering (AML) and know-your-customer (KYC) rules; (c) legitimate interest — to
            protect the security of our platform; and (d) consent — for marketing communications, which you may
            withdraw at any time.
          </p>
        </Section>

        <Section title="4. Sharing Your Information">
          <p className="text-muted-foreground leading-relaxed mb-3">
            We do not sell your personal data. We may share it with:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li><strong className="text-foreground">Payment processors</strong> — to complete financial transactions (e.g., PawaPay mobile money).</li>
            <li><strong className="text-foreground">Regulatory authorities</strong> — where required by law or licensing conditions.</li>
            <li><strong className="text-foreground">Service providers</strong> — trusted third parties who help us operate the platform, bound by confidentiality obligations.</li>
            <li><strong className="text-foreground">Law enforcement</strong> — when required by valid legal process.</li>
          </ul>
        </Section>

        <Section title="5. Data Retention">
          <p className="text-muted-foreground leading-relaxed">
            We retain your personal data for as long as your account is active and for a minimum of five (5) years
            after account closure, as required by applicable gambling and financial regulations. Transaction records
            may be retained for longer where mandated by law.
          </p>
        </Section>

        <Section title="6. Security">
          <p className="text-muted-foreground leading-relaxed">
            We implement industry-standard technical and organisational measures to protect your data, including
            encrypted connections (TLS), hashed passwords, access controls, and regular security reviews.
            No system is completely secure; you are responsible for maintaining the confidentiality of your
            account credentials.
          </p>
        </Section>

        <Section title="7. Your Rights">
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
            <li>Access the personal data we hold about you.</li>
            <li>Correct inaccurate data.</li>
            <li>Request deletion of your data (subject to legal retention requirements).</li>
            <li>Object to or restrict certain processing.</li>
            <li>Withdraw consent where processing is consent-based.</li>
          </ul>
          <p className="text-muted-foreground mt-3">
            To exercise any of these rights, contact us at <strong className="text-foreground">support@gowin.com</strong>.
          </p>
        </Section>

        <Section title="8. Cookies">
          <p className="text-muted-foreground leading-relaxed">
            We use session cookies and local storage tokens solely to keep you logged in and to remember your
            preferences. We do not use third-party advertising cookies. You may clear cookies through your browser
            settings, but this will log you out of the platform.
          </p>
        </Section>

        <Section title="9. Responsible Gambling">
          <p className="text-muted-foreground leading-relaxed">
            GoWin may use your account activity data to identify signs of problem gambling and to enforce
            self-exclusion or deposit limits you have requested. This processing is in the interest of player
            protection and is required by our operating licence.
          </p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p className="text-muted-foreground leading-relaxed">
            We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated"
            date at the top and, for material changes, notify you via email or an in-app notice. Continued use of
            the platform after changes constitutes acceptance of the updated policy.
          </p>
        </Section>

        <Section title="11. Contact Us">
          <p className="text-muted-foreground leading-relaxed">
            For privacy-related questions or requests, contact our Data Protection team at:
          </p>
          <div className="mt-3 p-4 rounded-lg bg-card border border-border text-sm text-muted-foreground space-y-1">
            <p><strong className="text-foreground">GoWin Sportsbook</strong></p>
            <p>Email: <strong className="text-foreground">privacy@gowin.com</strong></p>
            <p>Support: <strong className="text-foreground">support@gowin.com</strong></p>
          </div>
        </Section>

        {/* Footer */}
        <div className="border-t border-border pt-8 text-center text-xs text-muted-foreground/60 space-y-2">
          <p>© {YEAR} GoWin Sportsbook. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
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
