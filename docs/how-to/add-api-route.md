# Add an API Route

## 1. Create the file

All API routes live under `app/api/`. Follow the component structure rule — every route in its own folder:

```
app/api/my-feature/route.ts
app/api/my-feature/[id]/route.ts
```

## 2. Choose an auth strategy

**Session required:**
```ts
import { requireSession } from "@/lib/auth/require-session";

export async function GET(req: NextRequest) {
  const authed = await requireSession();
  if (authed.response) return authed.response;
  // authed.session is typed and non-null here
}
```

**Intentionally anonymous** (e.g. public data): skip `requireSession` and document the reason with a comment.

**Upload auth** (session OR upload token):
```ts
import { requireUploadAuth } from "@/lib/upload/upload-auth";

export async function POST(request: Request) {
  const authError = await requireUploadAuth(request);
  if (authError) return authError;
}
```

## 3. Use `ApiError` for error responses

Never hand-roll `NextResponse.json({ error }, { status })`:

```ts
import { ApiError } from "@/lib/api-errors";

// 400
return ApiError.badRequest("field is required");

// 401
return ApiError.unauthorized();

// 404
return ApiError.notFound("Recipe not found");

// 429
return ApiError.rateLimited(retryAfterSeconds);

// 500 — in catch blocks, captures to Sentry automatically
return ApiError.internal(error, req);

// 500 with a custom client message
return ApiError.internal(error, req, "Could not process your request");
```

## 4. Validate input

Parse the body in a try/catch and return `ApiError.invalidBody()` on failure:

```ts
let body: { name?: string };
try {
  body = await req.json();
} catch {
  return ApiError.invalidBody();
}
if (!body.name) return ApiError.badRequest("name required");
```

## 5. Register the URL in `lib/routes.ts`

Add the route to the `api` object so it can be imported everywhere:

```ts
export const api = {
  // ...existing routes
  myFeature: "/api/my-feature",
  myFeatureItem: (id: string) => `/api/my-feature/${id}`,
};
```

## 6. Write a test

Create `app/api/my-feature/__tests__/route.test.ts`. Mock Drizzle, Redis, and auth as needed. Test the happy path and at least the auth-failure and invalid-body cases.
