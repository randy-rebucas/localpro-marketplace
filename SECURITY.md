# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it confidentially. **Do not create public issues for security problems.**

- Email: security@localpromarketplace.com
- GitHub Security Advisories: use the "Security" tab → "Report a vulnerability" on this repository

We will acknowledge your report within 48 hours and aim to resolve confirmed vulnerabilities within 14 days.

## Sensitive Data Handling

- **Never commit secrets** (API keys, credentials, tokens, etc.) to the repository.
- All secrets must be stored in environment variables (see `.env.example` for the full list).
- Ensure `.env.local` and other secret files are listed in `.gitignore`.
- Rotate all secrets immediately if accidental exposure occurs.

## Access Control & Permissions

- Follow the principle of least privilege. Only grant access required for your role.
- RBAC is enforced; staff/admins have granular capabilities. Do not bypass access controls.
- Do not share credentials or privileged access with others.

## Environment Security

- Use Vercel environment variables for production secrets.
- Never share or expose `.env.local` or other sensitive files.
- Review and rotate secrets regularly (recommended: every 90 days).

## Best Practices

- Use strong passwords and enable 2FA on all accounts (GitHub, Vercel, MongoDB Atlas, PayMongo).
- JWT access tokens are short-lived (15 min); refresh tokens expire in 7 days and are rotatable.
- Rate limiting is enforced on all sensitive endpoints (auth, payments, webhooks).
- Passwords are hashed with bcrypt (cost factor 12).
- Content Security Policy (CSP), HSTS (2-year), X-Frame-Options: DENY, and other security headers are enforced in production.
- File uploads are validated for type and size before processing.
- All markdown user content is sanitized with DOMPurify before rendering.
- PayMongo webhook signatures are verified with HMAC-SHA256 and replay-attack protection (5-minute timestamp window).

## Incident Response

If you suspect a breach or accidental leak:
1. Immediately rotate all affected secrets (JWT secrets, API keys, DB credentials).
2. Notify the maintainers at security@localpromarketplace.com.
3. Review access logs and revoke compromised tokens/sessions.
4. Follow up with a post-incident review and document findings.

---

**Note:** This repository is protected by strict security controls. All contributors are expected to follow these guidelines to protect users and data.
