import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM = 'Airwaybill App <support@airwaybill.app>'

Deno.serve(async (req) => {
  try {
    const payload = await req.json()

    // Supabase webhook sends { type, table, record, ... }
    const record = payload?.record
    const email = record?.email
    const name = record?.raw_user_meta_data?.full_name
      || record?.raw_user_meta_data?.company_name
      || email?.split('@')[0]
      || 'there'

    if (!email) return new Response('no email', { status: 200 })

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Segoe UI,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#8B0000;padding:32px 40px;text-align:center;">
            <p style="margin:0;font-size:28px;">✈</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:800;letter-spacing:1px;">AIRWAYBILL APP</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">Air Waybill Generator — IATA Format</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 16px;font-size:20px;color:#222;">Welcome, ${name}! 🎉</h2>
            <p style="margin:0 0 16px;color:#444;line-height:1.6;font-size:15px;">
              Your account is ready. You can now generate professional Air Waybill documents in IATA format — directly in your browser, no installation needed.
            </p>

            <table cellpadding="0" cellspacing="0" style="margin:24px 0;background:#faf8f8;border-radius:8px;padding:20px;border:1px solid #e8dcdc;width:100%;box-sizing:border-box;">
              <tr><td>
                <p style="margin:0 0 10px;font-weight:700;color:#8B0000;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Your Free plan includes:</p>
                <p style="margin:4px 0;color:#444;font-size:14px;">✓ 10 AWB PDF downloads per month</p>
                <p style="margin:4px 0;color:#444;font-size:14px;">✓ Save and edit AWBs</p>
                <p style="margin:4px 0;color:#444;font-size:14px;">✓ IATA check digit validation</p>
                <p style="margin:4px 0;color:#444;font-size:14px;">✓ Auto-save documents</p>
              </td></tr>
            </table>

            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#8B0000;border-radius:8px;padding:12px 28px;">
                  <a href="https://airwaybill.app/editor" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;">Open the Editor →</a>
                </td>
              </tr>
            </table>

            <p style="margin:32px 0 0;color:#666;font-size:13px;line-height:1.6;">
              Need help? Reply to this email or visit <a href="https://airwaybill.app" style="color:#8B0000;">airwaybill.app</a>.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f4f4f4;padding:20px 40px;text-align:center;border-top:1px solid #e8dcdc;">
            <p style="margin:0;font-size:12px;color:#999;">
              © 2025 Thovex Software Factory · <a href="https://airwaybill.app/terms" style="color:#999;">Terms</a> · <a href="https://airwaybill.app/privacy" style="color:#999;">Privacy</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: 'Welcome to Airwaybill App ✈',
        html,
      }),
    })

    const result = await res.json()
    console.log('Resend response:', result)
    return new Response(JSON.stringify(result), { status: 200 })

  } catch (err) {
    console.error('welcome-email error:', err)
    return new Response('error', { status: 200 }) // always 200 so webhook doesn't retry
  }
})
