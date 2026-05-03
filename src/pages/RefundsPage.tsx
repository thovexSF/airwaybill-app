import React from 'react'
import { Link } from 'react-router-dom'
import './LegalPage.css'

export function RefundsPage() {
  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link to="/">← Home</Link>
        <Link to="/" className="legal-header-logo">✈ AIRWAYBILL APP</Link>
      </header>

      <div className="legal-body">
        <h1>Refund Policy</h1>
        <p className="legal-date">Last updated: May 3, 2025</p>

        <p>
          At <strong>Airwaybill App</strong> we want you to be satisfied with our Service.
          This Refund Policy describes your options for refunds and cancellations.
          Payments are processed by <strong>Paddle</strong>, who acts as our merchant of record.
        </p>

        <h2>1. Money-Back Guarantee</h2>
        <p>
          If you are a <strong>first-time subscriber</strong> to any paid plan (Starter or Pro)
          and you are not satisfied, you may request a full refund within{' '}
          <strong>7 days of your initial payment</strong>. No questions asked.
        </p>
        <p>
          To request a refund under this guarantee, send an email to{' '}
          <a href="mailto:support@airwaybill.app">support@airwaybill.app</a> with the subject
          line <em>"Refund Request"</em> and include the email address associated with your
          account. Refunds are typically processed within 5–10 business days, depending on
          your payment method and bank.
        </p>

        <h2>2. Cancellations</h2>
        <p>
          You may cancel your subscription at any time from your account settings or by
          contacting us. When you cancel:
        </p>
        <ul>
          <li>Your subscription remains active until the <strong>end of the current
              billing period</strong>.</li>
          <li>You will not be charged for the next billing cycle.</li>
          <li>No partial refunds are issued for unused days in the current period
              (except under the 7-day money-back guarantee above).</li>
        </ul>

        <h2>3. Non-Refundable Situations</h2>
        <p>The following are generally not eligible for a refund:</p>
        <ul>
          <li>Renewals beyond the first billing period (unless required by applicable law).</li>
          <li>Accounts suspended or terminated due to violations of our{' '}
              <Link to="/terms">Terms of Service</Link>.</li>
          <li>Charges that occurred more than 30 days prior to the refund request.</li>
        </ul>

        <h2>4. Duplicate Charges</h2>
        <p>
          If you believe you have been charged in error or received a duplicate charge,
          contact us immediately at{' '}
          <a href="mailto:support@airwaybill.app">support@airwaybill.app</a>. We will
          investigate and, if confirmed, process a full refund for the erroneous charge.
        </p>

        <h2>5. Annual Plans</h2>
        <p>
          Annual subscriptions may be refunded in full within 7 days of purchase. After
          7 days, annual plans are non-refundable. You may downgrade or cancel to prevent
          renewal before the next annual term.
        </p>

        <h2>6. Free Plan</h2>
        <p>
          The Free plan has no cost, so no refunds are applicable. To stop using the
          Service simply stop logging in; your data will be retained for 90 days in
          case you return.
        </p>

        <h2>7. How Refunds Are Issued</h2>
        <p>
          Refunds are returned to the original payment method (credit/debit card) used
          at the time of purchase. Processing time depends on your bank and is typically
          5–10 business days after we approve the refund. Paddle will send you a receipt
          for the refund.
        </p>

        <h2>8. Contact</h2>
        <p>
          For any refund or billing questions, please contact us:<br />
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
