// UI-only convenience: shows the Admin link to this user. The real gate is
// the server's ADMIN_EMAILS check on GET /v1/admin/overview — this list
// controls visibility, not access.
const ADMIN_UI_EMAILS = new Set(['thovexfactory@gmail.com'])

export function isAdminUiUser(email: string | null | undefined): boolean {
  return !!email && ADMIN_UI_EMAILS.has(email.toLowerCase())
}
