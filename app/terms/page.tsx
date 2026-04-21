import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Vanish',
  description:
    'Terms, disclaimers, and limits for using Vanish. Experimental software, used at your own risk.',
  openGraph: {
    title: 'Terms of Service — Vanish',
    description: 'Experimental software · use at your own risk.',
    images: [{ url: '/api/og?v=terms', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Terms of Service — Vanish',
    description: 'Experimental software · use at your own risk.',
    images: ['/api/og?v=terms'],
  },
};

const EFFECTIVE = 'April 21, 2026';

export default function TermsPage() {
  return (
    <section className="card security-sections">
      <h1>Terms of Service</h1>
      <p className="intro" style={{ margin: 0 }}>
        Effective: {EFFECTIVE}. By using Vanish (<code>hy.gl</code>), you agree to the terms
        below.
      </p>

      <h3>1. This is experimental software</h3>
      <p>
        Vanish is an experimental project provided as a convenience, without warranty of any
        kind. It may change, break, lose data, go offline without notice, or behave in ways we
        did not anticipate. <strong>Use at your own risk.</strong> Do not rely on Vanish for
        anything critical — legal records, irreplaceable secrets, operational credentials, or
        anything whose loss, exposure, or delay would matter.
      </p>

      <h3>2. No warranty</h3>
      <p>
        The service is provided <strong>&ldquo;as is&rdquo;</strong> and{' '}
        <strong>&ldquo;as available&rdquo;</strong>, with all faults and without warranty of any
        kind — express, implied, statutory, or otherwise — including merchantability, fitness
        for a particular purpose, non-infringement, accuracy, availability, or security. No
        advice or information, whether oral or written, obtained from Vanish or its operators,
        creates any warranty not expressly stated here.
      </p>

      <h3>3. No liability</h3>
      <p>
        To the maximum extent permitted by law, Vanish, its operators, contributors, and hosting
        providers are <strong>not liable</strong> for any direct, indirect, incidental,
        consequential, special, exemplary, or punitive damages arising from or related to your
        use of the service — including lost data, lost profits, business interruption, leaked
        messages, or any other harm — even if advised of the possibility of such damages.
      </p>

      <h3>4. No guarantee of privacy in every threat model</h3>
      <p>
        We design Vanish to be end-to-end encrypted: the server never sees your plaintext or
        decryption key. See <a href="/security">/security</a> for the details. However:
      </p>
      <ul>
        <li>
          Browser-delivered cryptography is only as safe as the JavaScript your browser receives.
          If our hosting provider or build pipeline is compromised, the guarantee can be
          subverted. We do not warrant against this.
        </li>
        <li>
          Anyone with the link can read the note until it expires. Treat it like a one-time
          password.
        </li>
        <li>
          Your browser, operating system, extensions, keyboards, and networks are outside our
          control.
        </li>
      </ul>

      <h3>5. No recovery</h3>
      <p>
        If you lose the link, the note cannot be recovered — <strong>not even by us</strong>. We
        don&apos;t hold the key. Do not use Vanish to store the only copy of anything you care
        about.
      </p>

      <h3>6. Acceptable use</h3>
      <p>Do not use Vanish to:</p>
      <ul>
        <li>Store or transmit content that is illegal where you or the recipient are located;</li>
        <li>Distribute malware, phishing payloads, or content intended to harm others;</li>
        <li>Attempt to overwhelm, probe for vulnerabilities without authorization, or abuse the service;</li>
        <li>Circumvent rate limits, access controls, or other protections.</li>
      </ul>
      <p>
        We may remove content and revoke access at our discretion. Because we cannot read
        plaintext, removals are based on metadata, reports, or abuse signals rather than content
        inspection.
      </p>

      <h3>7. Shortener</h3>
      <p>
        The URL shortener redirects to destinations chosen by users. We do not endorse, verify,
        or assume responsibility for any destination. If a short link points somewhere harmful
        and we become aware, we may disable it.
      </p>

      <h3>8. No accounts, no personal data</h3>
      <p>
        Vanish does not require an account and does not collect personal information. Standard
        web request metadata (IP, user-agent, timing) may be logged briefly by our hosting
        provider; see <a href="/security">/security</a>.
      </p>

      <h3>9. Changes and termination</h3>
      <p>
        We may change these terms, change or discontinue the service, or delete stored ciphertext
        at any time without notice. We&apos;ll try to give notice for major changes, but we
        don&apos;t promise to.
      </p>

      <h3>10. Governing law</h3>
      <p>
        These terms are governed by the laws of the operator&apos;s jurisdiction, without regard
        to conflict-of-laws rules. Disputes will be resolved in courts located there.
      </p>

      <h3>11. Contact</h3>
      <p>
        For questions, abuse reports, or to request removal, contact the operator via the email
        associated with the domain <code>hy.gl</code>.
      </p>

      <p className="hint" style={{ marginTop: 24 }}>
        If any provision of these terms is held unenforceable, the rest remains in effect. These
        terms are the entire agreement between you and us regarding the service and replace any
        prior ones.
      </p>
    </section>
  );
}
