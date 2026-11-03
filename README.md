# 7X SNIPER Codex AI API (Vercel)

This repository deploys the backend API only. Your existing website can remain in its separate project.

## Files

- `api/chat.js` — POST chat endpoint
- `vercel.json` — Vercel function configuration
- `package.json` — Node.js project metadata (CommonJS-compatible; no ESM setting)

## Deploy

1. Upload the **contents** of this folder to the root of a new GitHub repository. The `api` folder must be directly at the repository root.
2. Import that repository into Vercel and deploy.
3. In Vercel → Project → Settings → Environment Variables, add these for Production:
   - `AI_API_KEY` — your OpenAI API secret key
   - `AI_MODEL` — an exact model ID available to your OpenAI API account
   - `API_ACCESS_PASSWORD` — a long, private password you create
   - `ALLOWED_ORIGIN` — your website's exact origin, e.g. `https://your-site.vercel.app` (no path or trailing slash)
4. Redeploy after adding or changing environment variables.

## Endpoint

`POST https://YOUR-VERCEL-DOMAIN/api/chat`

The root URL is a backend project, not your website. A root-page 404 does not prove the API is broken. Test the endpoint by sending a POST request with JSON and the `X-API-Password` header. Opening `/api/chat` directly in a browser sends GET and is expected to return `405 Use POST.`

Request body:

```json
{
  "messages": [
    { "role": "user", "content": "Hello 7X SNIPER" }
  ]
}
```

Required header: `X-API-Password: YOUR_API_ACCESS_PASSWORD`

## Connect your existing website

In your website HTML, set `CODEX_API_URL` to `https://YOUR-VERCEL-DOMAIN/api/chat`. Do not put your OpenAI API key in HTML. The shared access password is only a basic gate; for a public multi-user service, use proper user authentication and shared rate limiting.

## Troubleshooting

- `404`: confirm `api/chat.js` is at the GitHub repository root under `api/`, then redeploy.
- `405` from a browser GET: expected; endpoint accepts POST only.
- `401`: entered password does not match `API_ACCESS_PASSWORD`.
- `500`: one or more environment variables are missing.
- `502`: check API key, model ID, API account billing and permissions.
- `403`: make `ALLOWED_ORIGIN` exactly match the website origin.

Never commit real API keys or passwords to GitHub.
