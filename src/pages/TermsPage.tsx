import React from 'react'
import { Link } from 'react-router-dom'
import './LegalPage.css'

export function TermsPage() {
  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link to="/">← Home</Link>
        <Link to="/" className="legal-header-logo">✈ AIRWAYBILL APP</Link>
      </header>

      <div className="legal-body">
        <h1>Terms of Service</h1>
        <p className="legal-date">Last updated: May 3, 2025</p>

        <p>
          Please read these Terms of Service ("Terms") carefully before using
          <strong> Airwaybill App</strong>, a service operated by{' '}
          <strong>Thovex Software Factory</strong> ("Service", "we", "us", or "our")
          at <a href="https://airwaybill.app">airwaybill.app</a>.
          By accessing or using the Service you agree to be bound by these Terms.
          If you do not agree, do not use the Service.
        </p>

        <h2>1. Description of Service</h2>
        <p>
          Airwaybill App is a cloud-based software-as-a-service (SaaS) platform that allows
          air-freight professionals to generate, store, and manage Air Waybill (AWB) documents
          in IATA format. The Service is provided on a subscription basis with a limited free tier.
        </p>

        <h2>2. Eligibility</h2>
        <p>
          You must be at least 18 years old and have the legal authority to enter into
          these Terms on behalf of yourself or your organization. By creating an account you
          represent that you meet these requirements.
        </p>

        <h2>3. Account Registration</h2>
        <p>
          You are responsible for maintaining the confidentiality of your credentials and
          for all activities that occur under your account. Notify us immediately at{' '}
          <a href="mailto:support@airwaybill.app">support@airwaybill.app</a> if you suspect
          unauthorized use.
        </p>

        <h2>4. Subscription Plans and Billing</h2>
        <ul>
          <li>The Free plan allows up to 10 documents of any type per calendar month at no cost.</li>
          <li>Paid plans (Starter, Pro, Enterprise) are billed monthly or annually via Paddle,
              our payment processor. Prices are displayed on our{' '}
              <Link to="/pricing">Pricing page</Link> and may change with 30 days' notice.</li>
          <li>All fees are charged in USD and are exclusive of applicable taxes.</li>
          <li>Subscriptions automatically renew unless cancelled before the renewal date.</li>
        </ul>

        <h2>5. Refunds and Cancellations</h2>
        <p>
          Please refer to our <Link to="/refunds">Refund Policy</Link> for full details.
          In summary, paid subscriptions may be cancelled at any time; access continues
          until the end of the current billing period. We offer a 7-day money-back guarantee
          for first-time purchases.
        </p>

        <h2>6. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any unlawful purpose or in violation of any regulation.</li>
          <li>Attempt to reverse-engineer, copy, or redistribute the platform's software.</li>
          <li>Upload malicious code, spam, or content that infringes third-party rights.</li>
          <li>Use automated tools to scrape or bulk-export data from the Service.</li>
        </ul>

        <h2>7. Intellectual Property</h2>
        <p>
          The Service, its source code, design, trademarks, and content are owned by or
          licensed to Airwaybill App. AWB documents you generate belong to you; we claim no
          ownership over your data. You grant us a limited, non-exclusive licence to store and
          process your data solely to provide the Service.
        </p>

        <h2>8. Data and Privacy</h2>
        <p>
          Your use of the Service is also governed by our <Link to="/privacy">Privacy Policy</Link>,
          which is incorporated into these Terms by reference.
        </p>

        <h2>9. Disclaimer of Warranties</h2>
        <p>
          THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED,
          INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
          PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
          UNINTERRUPTED, ERROR-FREE, OR THAT GENERATED DOCUMENTS WILL BE ACCEPTED BY ANY
          CARRIER OR CUSTOMS AUTHORITY.
        </p>

        <h2>10. Limitation of Liability</h2>
        <p>
          TO THE FULLEST EXTENT PERMITTED BY LAW, AIRWAYBILL APP SHALL NOT BE LIABLE FOR
          ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR
          LOSS OF PROFITS, DATA, OR BUSINESS GOODWILL, ARISING OUT OF OR RELATED TO THESE
          TERMS OR YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
          DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT PAID BY YOU IN THE
          TWELVE MONTHS PRECEDING THE CLAIM.
        </p>

        <h2>11. Termination</h2>
        <p>
          We reserve the right to suspend or terminate your account at any time for material
          breach of these Terms. You may delete your account at any time from your account
          settings. Upon termination, your data may be deleted after 30 days.
        </p>

        <h2>12. Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. We will notify registered users by
          email or via an in-app notice at least 14 days before significant changes take
          effect. Continued use of the Service after the effective date constitutes acceptance.
        </p>

        <h2>13. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the Republic of Chile, without regard to
          conflict of law principles. Any disputes shall be resolved in the competent courts
          of Santiago, Chile.
        </p>

        <h2>14. Contact</h2>
        <p>
          Questions about these Terms? Contact us at:<br />
          <strong>Thovex Software Factory</strong><br />
          <a href="mailto:support@airwaybill.app">support@airwaybill.app</a>
        </p>
      </div>

      <footer className="legal-footer">
        <span>© 2025 Thovex Software Factory</span>
        <Link to="/terms">Terms of Service</Link>
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/refunds">Refund Policy</Link>
        <a href="mailto:support@airwaybill.app">support@airwaybill.app</a>
      </footer>
    </div>
  )
}
