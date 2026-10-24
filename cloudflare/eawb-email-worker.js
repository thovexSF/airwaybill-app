/**
 * Cloudflare Email Worker for eawb@airwaybill.app (Email Routing is free).
 * Hands every airline reply (FMA / FNA / FSU) to the app, which files it under
 * its AWB, and keeps a copy in a human mailbox.
 *
 * Setup, in the Cloudflare dashboard for airwaybill.app:
 *   1. Workers & Pages → Create → "Hello World" Worker, paste this file, deploy.
 *   2. Worker → Settings → Variables:
 *        INBOUND_URL          https://airwaybill.app/api/eawb/inbound/cloudflare
 *        EAWB_INBOUND_SECRET  (secret) same value as EAWB_INBOUND_SECRET in Railway
 *        FORWARD_TO           optional: a verified Email Routing destination for a copy
 *   3. Email → Email Routing → Routing rules → Custom address
 *        eawb@airwaybill.app → Send to a Worker → this Worker.
 */
export default {
  async email(message, env) {
    const raw = await new Response(message.raw).text()
    const res = await fetch(env.INBOUND_URL, {
      method: 'POST',
      headers: { 'content-type': 'message/rfc822', 'x-eawb-secret': env.EAWB_INBOUND_SECRET },
      body: raw,
    })
    if (env.FORWARD_TO) await message.forward(env.FORWARD_TO)
    // Bouncing tells the airline's gateway the reply did not land; the copy above, if any, still went out.
    if (!res.ok && !env.FORWARD_TO) message.setReject(`eAWB inbound failed (${res.status})`)
  },
}
