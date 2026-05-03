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
          At <strong>Thovex Software Factory</strong> ("we", "us", "our"), operator of
          Airwaybill App, we want you to be fully satisfied with our Service.
          Payments are processed by <strong>Paddle</strong>, who acts as our merchant of record.
          All refund requests are handled in accordance with{' '}
          <a href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noopener noreferrer">
            Paddle's Refund Policy
          </a>.
        </p>

        <h2>1. 14-Day Money-Back Guarantee</h2>
        <p>
          We offer a <strong>full refund within 14 days of any payment</strong> — no questions asked.
          This applies to all paid plans (Starter and Pro), including renewals.
        </p>
        <p>
          To request a refund, send an email to{' '}
          <a href="mailto:support@airwaybill.app">support@airwaybill.app</a> with the subject
          line <em>"Refund Request"</em> and include the email address associated with your
          account. Refunds are processed within 5–10 business days to your original
          payment method. Paddle will send you a confirmation receipt.
        </p>

        <h2>2. How to Request a Refund</h2>
        <p>You may request a refund in any of the following ways:</p>
        <ul>
          <li>Email us at <a href="mailto:support@airwaybill.app">support@airwaybill.app</a></li>
          <li>Contact Paddle directly at <a href="https://www.paddle.com/support" target="_blank" rel="noopener noreferrer">paddle.com/support</a></li>
        </ul>
        <p>
          Refunds are returned to the original payment method used at purchase and typically
          appear within 5–10 business days depending on your bank.
        </p>

        <h2>3. Cancellations</h2>
        <p>
          You may cancel your subscription at any time. When you cancel:
        </p>
        <ul>
          <li>Your subscription remains active until the <strong>end of the current billing period</strong>.</li>
          <li>You will not be charged for the next billing cycle.</li>
          <li>You may request a refund within 14 days of any charge as described above.</li>
        </ul>

        <h2>4. Duplicate or Erroneous Charges</h2>
        <p>
          If you believe you have been charged in error or received a duplicate charge,
          contact us immediately at{' '}
          <a href="mailto:support@airwaybill.app">support@airwaybill.app</a>. We will
          investigate and, if confirmed, process a full refund promptly.
        </p>

        <h2>5. Free Plan</h2>
        <p>
          The Free plan has no cost, so no refunds are applicable.
        </p>

        <h2>6. Contact</h2>
        <p>
          For any refund or billing questions:<br />
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
