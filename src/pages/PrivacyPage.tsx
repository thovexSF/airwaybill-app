import React from 'react'
import { Link } from 'react-router-dom'
import './LegalPage.css'

export function PrivacyPage() {
  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link to="/">← Home</Link>
        <Link to="/" className="legal-header-logo">✈ AIRWAYBILL APP</Link>
      </header>

      <div className="legal-body">
        <h1>Privacy Policy</h1>
        <p className="legal-date">Last updated: May 3, 2025</p>

        <p>
          At <strong>Airwaybill App</strong> ("we", "us", or "our"), we respect your privacy
          and are committed to protecting your personal data. This Privacy Policy explains how
          we collect, use, and safeguard information when you use{' '}
          <a href="https://airwaybill.app">airwaybill.app</a>.
        </p>

        <h2>1. Information We Collect</h2>
        <p><strong>Account data:</strong> When you register, we collect your email address,
        company name, and (if applicable) OAuth profile data (name, profile picture) from
        Google, GitHub, or Apple.</p>
        <p><strong>AWB document data:</strong> The shipment information you enter to generate
        Air Waybill documents is stored in our database to enable saving and retrieving
        your documents.</p>
        <p><strong>Payment data:</strong> Payments are processed by Paddle. We do not store
        your credit card numbers. We receive a customer reference ID and subscription
        status from Paddle.</p>
        <p><strong>Usage data:</strong> We collect anonymized analytics (pages visited,
        features used, document count) to improve the Service. We use privacy-friendly,
        cookieless analytics that do not track you across other sites.</p>
        <p><strong>Technical data:</strong> IP address, browser type, and device information
        may be logged for security and debugging purposes.</p>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To create and manage your account and organization.</li>
          <li>To provide, maintain, and improve the Service.</li>
          <li>To process payments and manage subscriptions.</li>
          <li>To send transactional emails (account verification, password reset, billing receipts).</li>
          <li>To contact you about significant changes to the Service or these policies.</li>
          <li>To detect fraud and ensure platform security.</li>
        </ul>

        <h2>3. Legal Basis for Processing (GDPR)</h2>
        <p>If you are in the European Economic Area (EEA), we process your data on the
        following legal bases:</p>
        <ul>
          <li><strong>Contract performance</strong> — providing the Service you signed up for.</li>
          <li><strong>Legitimate interests</strong> — security, fraud prevention, analytics.</li>
          <li><strong>Consent</strong> — marketing communications (you may withdraw at any time).</li>
          <li><strong>Legal obligation</strong> — complying with applicable law.</li>
        </ul>

        <h2>4. Sharing of Information</h2>
        <p>We do not sell your personal data. We share data only with:</p>
        <ul>
          <li><strong>Supabase</strong> — database and authentication infrastructure (data
              processed in the EU/US under their DPA).</li>
          <li><strong>Paddle</strong> — payment processor acting as merchant of record.</li>
          <li><strong>Analytics provider</strong> — cookieless, anonymized aggregate data only.</li>
          <li><strong>Law enforcement</strong> — when required by valid legal process.</li>
        </ul>

        <h2>5. Data Retention</h2>
        <p>
          We retain your account data for as long as your account is active. If you delete
          your account, we will delete your personal data within 30 days, except where we
          are required to retain it for legal or accounting purposes (up to 7 years for
          billing records).
        </p>

        <h2>6. Security</h2>
        <p>
          We implement industry-standard security measures including encryption in transit
          (TLS), encrypted storage, and row-level security on our database. However, no
          system is 100% secure. Please use a strong, unique password for your account.
        </p>

        <h2>7. Your Rights</h2>
        <p>Depending on your location, you may have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you.</li>
          <li>Request correction of inaccurate data.</li>
          <li>Request deletion ("right to be forgotten").</li>
          <li>Object to or restrict certain processing.</li>
          <li>Data portability (receive your data in a machine-readable format).</li>
          <li>Withdraw consent at any time.</li>
        </ul>
        <p>To exercise these rights, contact us at{' '}
          <a href="mailto:support@airwaybill.app">support@airwaybill.app</a>.
        </p>

        <h2>8. Cookies</h2>
        <p>
          We use only strictly necessary cookies (for session management). We do not use
          advertising or tracking cookies. Our analytics tool is cookieless.
        </p>

        <h2>9. Children's Privacy</h2>
        <p>
          The Service is not directed to individuals under 18 years of age. We do not
          knowingly collect personal data from children.
        </p>

        <h2>10. International Transfers</h2>
        <p>
          Your data may be transferred to and processed in countries outside your own,
          including the United States. We ensure appropriate safeguards are in place
          (such as Standard Contractual Clauses) when required by law.
        </p>

        <h2>11. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy periodically. We will notify you of material
          changes via email or an in-app notice before they take effect.
        </p>

        <h2>12. Contact</h2>
        <p>
          Questions or requests regarding your privacy? Contact our data controller at:<br />
          <strong>Airwaybill App</strong><br />
          <a href="mailto:support@airwaybill.app">support@airwaybill.app</a>
        </p>
      </div>

      <footer className="legal-footer">
        <span>© 2025 Airwaybill App</span>
        <Link to="/terms">Terms of Service</Link>
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/refunds">Refund Policy</Link>
        <a href="mailto:support@airwaybill.app">support@airwaybill.app</a>
      </footer>
    </div>
  )
}
