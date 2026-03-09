# Security

This document describes how Typesense Admin UI handles credentials, the security measures in place, and recommendations for production deployments.

---

## How Credentials Are Handled

This application is **fully stateless on the server** — no API keys or Typesense credentials are stored server-side. All credential storage is client-side:

| Storage | Purpose | Lifetime | Scope |
|---|---|---|---|
| Browser Cookie (`typesense_connection`) | Active session — forwarded to API proxy routes via headers | 1 year | Same-site only |
| localStorage | "Remember me" — pre-fills login form on return visits | 30-day sliding window | Browser only |

Credentials are **never** stored on the server, sent to third parties, or exposed in the browser bundle.

---

## Security Measures

### Client-Side
- **Cookies use `SameSite=Strict`** — prevents CSRF attacks
- **`Secure` flag** — added automatically on HTTPS connections
- **API keys masked in UI** — only first 4 and last 4 characters shown (e.g., `abcd••••••wxyz`)
- **Session idle timeout** — auto-logout after 1 hour of inactivity
- **No credentials in URLs** — API keys transmitted via HTTP headers, never in query parameters

### Server-Side
- **No server-side credential storage** — fully stateless server
- **No environment variables needed** — nothing to leak from deployment config
- **Security headers** on all responses:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **Error messages sanitized** — internal server details and API keys never included in error responses
- **No third-party data sharing** — all API calls go to same-origin proxy or directly to your Typesense server

---

## Config Export/Import Security

The Settings page allows exporting connection configuration as a JSON file. This file contains the API key in plain text:

```json
{
  "host": "my-server.example.com",
  "port": 443,
  "protocol": "https",
  "apiKey": "your-api-key-here"
}
```

**Recommendations:**
- Treat exported config files like passwords — do not commit to version control
- Share config files only through secure channels
- Delete config files after importing

---

## Recommendations for Production

1. **Always use HTTPS** — Vercel provides this automatically. For self-hosted deployments, use a reverse proxy (nginx, Caddy) with SSL.

2. **Use scoped API keys** — Create a Typesense API key with only the permissions this UI needs, rather than using the admin master key.

3. **Restrict network access** — If possible, limit your Typesense server's firewall to accept connections only from your deployment's IP range.

4. **Enable platform authentication** — For added security:
   - **Vercel:** Enable [Vercel Authentication](https://vercel.com/docs/security/deployment-protection) to require login before accessing the admin UI
   - **Self-hosted:** Use HTTP Basic Auth or an identity proxy (OAuth2 Proxy, Authelia) in front of the app

5. **Rotate API keys regularly** — Use the API Keys page to create new keys and delete old ones.

6. **Monitor access** — Check your Typesense server logs for unusual API activity from the admin UI's IP.
