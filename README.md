# 7X SNIPER CODEX AI

A serverless AI chat API powered by OpenAI Responses API
and deployed using Vercel.

## Requirements

- GitHub account
- Vercel account
- OpenAI API key

## Installation

1. Create a new GitHub repository.
2. Upload all project files.
3. Open Vercel.
4. Import the GitHub repository.
5. Deploy the project.

## Environment Variables

Add these variables in Vercel:

API_ACCESS_PASSWORD = daksh
AI_API_KEY = your_openai_api_key
AI_MODEL = gpt-6-luna
ALLOWED_ORIGIN = *

For production, replace * with your website domain.

## API Endpoint

POST /api/chat

## Authentication

Header:

X-API-Password: daksh

## Request

{
  "messages": [
    {
      "role": "user",
      "content": "Hello 7X SNIPER"
    }
  ]
}

## Successful Response

{
  "success": true,
  "brand": "7X SNIPER CODEX AI",
  "reply": "Hello! How can I help?",
  "model": "gpt-6-luna"
}

## Important

Never upload your real .env file or API key to GitHub.

A password embedded in public frontend JavaScript is visible
to website visitors. Use proper user authentication and
server-side session checks for a public production website.