# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it confidentially by emailing the repository maintainers or using GitHub Security Advisories. Do **not** create public issues for security problems.

- Email: [REPLACE_WITH_EMAIL]
- GitHub Security Advisories: https://github.com/[REPO]/security/advisories

## Sensitive Data Handling

- **Never commit secrets** (API keys, credentials, tokens, etc.) to the repository.
- All secrets must be stored in environment variables (e.g., `.env.local`).
- Ensure `.env.local` and other secret files are listed in `.gitignore`.
- Rotate all secrets immediately if accidental exposure occurs.

## Access Control & Permissions

- Follow the principle of least privilege. Only grant access required for your role.
- RBAC is enforced; staff/admins have granular capabilities. Do not bypass access controls.
- Do not share credentials or privileged access with others.

## Environment Security

- Use Vercel environment variables for production secrets.
- Never share or expose `.env.local` or other sensitive files.
- Review and update secrets regularly.

## Best Practices

- Use strong passwords and enable 2FA on all accounts.
- JWT tokens are short-lived and revocable; do not share tokens.
- Rate limiting is enforced on sensitive endpoints.
- Passwords are hashed with bcrypt-12.
- Content Security Policy (CSP), HSTS, and other headers are enforced.
- File uploads are validated and stored securely.

## Incident Response

If you suspect a breach or accidental leak:
1. Immediately rotate all affected secrets.
2. Notify the maintainers.
3. Review access logs and revoke compromised credentials.
4. Follow up with a post-incident review.

## References
- [Full Application Audit](docs/full-app-audit.md)
- [Accounting Design](docs/accounting-design.md)

---

**Note:** This repository is protected by strict security controls. All contributors are expected to follow these guidelines to protect users and data.
