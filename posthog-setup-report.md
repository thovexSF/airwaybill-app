<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Airwaybill App. PostHog is initialized in `src/main.tsx` and the app is wrapped with `PostHogProvider` and `PostHogErrorBoundary` for automatic error capture. Users are identified on login (email and OAuth) via `AuthContext.tsx`, and `posthog.reset()` is called on logout. Fifteen business events are instrumented across 9 files, covering the full funnel from demo visit through signup, core product use (saving/downloading AWBs), billing lifecycle, and support actions.

| Event name | Description | File |
|---|---|---|
| `user_signed_up` | User completes email/password registration successfully. | `src/pages/SignupPage.tsx` |
| `user_signed_up_with_provider` | User initiates OAuth signup via Google or GitHub. | `src/pages/SignupPage.tsx` |
| `user_logged_in` | User successfully authenticates via email or OAuth provider. | `src/auth/AuthContext.tsx` |
| `user_logged_out` | User signs out (posthog.reset() called). | `src/auth/AuthContext.tsx` |
| `demo_viewed` | Visitor opens the public demo editor — top of the conversion funnel. | `src/pages/DemoEditorPage.tsx` |
| `checkout_opened` | User clicks an upgrade button and the Paddle checkout overlay opens. | `src/pages/PricingPage.tsx` |
| `subscription_completed` | User reaches the billing success page after a successful subscription payment. | `src/pages/BillingSuccessPage.tsx` |
| `plan_downgraded` | User downgrades their subscription to a lower paid tier. | `src/pages/PricingPage.tsx` |
| `subscription_cancelled` | User cancels their active subscription. | `src/pages/PricingPage.tsx` |
| `awb_saved` | User saves an AWB, HAWB, DGD, or Manifest document to the cloud. | `src/pages/EditorPage.tsx` |
| `awb_downloaded` | User downloads an AWB or HAWB document as a PDF. | `src/pages/EditorPage.tsx` |
| `awb_deleted` | User deletes a document from their My AWBs list. | `src/pages/MyAWBsPage.tsx` |
| `excel_imported` | User successfully imports an Excel file to create AWB documents in bulk. | `src/components/ImportModal.tsx` |
| `feedback_submitted` | User submits a feedback message via the floating feedback widget. | `src/components/FeedbackWidget.tsx` |
| `settings_saved` | User saves organization default settings (shipper, carrier, airport, etc.). | `src/pages/SettingsPage.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) dashboard](https://us.posthog.com/project/483052/dashboard/1751841)
- [New signups over time](https://us.posthog.com/project/483052/insights/UMPeOWE6)
- [AWB documents downloaded](https://us.posthog.com/project/483052/insights/jz4XWhsx)
- [Demo-to-signup conversion funnel](https://us.posthog.com/project/483052/insights/zVmzKOT6)
- [Checkout-to-subscription conversion funnel](https://us.posthog.com/project/483052/insights/z5SizHXc)
- [Subscription cancellations vs new subscriptions](https://us.posthog.com/project/483052/insights/iIxagsxm)

## Verify before merging

- [ ] Run a full production build (`npm run build`) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` and `VITE_PUBLIC_POSTHOG_HOST` to `.env.example` and any onboarding scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify.
- [ ] Confirm the returning-visitor path also calls `identify` — the current implementation identifies on fresh login and on each `SIGNED_IN` auth state change; verify that an existing session restored on page reload still leads to a correct identified session in PostHog.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
