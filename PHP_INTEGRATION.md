# ArtStage — PHP Integration

Your legacy PHP app links logged-in users into ArtStage with a signed,
short-lived JWT. The token carries the user's identity; ArtStage validates
it, provisions the user in its own auth, and drops them into `/studio`.

## 1. The shared secret

In ArtStage, the secret is stored as `PHP_BRIDGE_SECRET`.
Copy the **exact same value** into your PHP `.env` (never commit it):

```
ARTSTAGE_BRIDGE_SECRET=replace-with-the-same-value
ARTSTAGE_URL=https://your-artstage-domain.com
```

## 2. Mint the token + build the link

Requires `firebase/php-jwt` (`composer require firebase/php-jwt`).

```php
<?php
use Firebase\JWT\JWT;

function artstage_link(array $user, string $redirect = '/studio'): string {
    $secret = $_ENV['ARTSTAGE_BRIDGE_SECRET'];
    $base   = rtrim($_ENV['ARTSTAGE_URL'], '/');

    $now = time();
    $payload = [
        'sub'   => (string)$user['id'],      // your PHP user id
        'email' => $user['email'],
        'name'  => $user['display_name'] ?? null,
        'iat'   => $now,
        'exp'   => $now + 120,               // 2 minutes — short-lived!
    ];

    $jwt = JWT::encode($payload, $secret, 'HS256');

    return $base . '/api/bridge/enter'
        . '?token='    . urlencode($jwt)
        . '&redirect=' . urlencode($redirect);
}
```

## 3. Render the button

```php
<a href="<?= htmlspecialchars(artstage_link($currentUser)) ?>"
   class="btn btn-primary">
   Stage a room with AI
</a>
```

That's it. The user clicks the button, ArtStage verifies the JWT, creates
(or finds) their account, sets a session, and lands them on the studio.

## 4. Notes

- **Always mint a fresh token per click.** Tokens expire in 120 seconds; do
  not cache or print them on cacheable pages.
- **Use HTTPS everywhere.** The token is a bearer credential in the URL.
- **Email must match.** ArtStage keys users by email. If your PHP users
  don't have unique emails, swap `sub` for a stable internal id and adjust
  the bridge route to key on that instead.
- **Rotating the secret**: change `PHP_BRIDGE_SECRET` in ArtStage settings
  AND `ARTSTAGE_BRIDGE_SECRET` in PHP at the same time. Any tokens in
  flight will be rejected.

## 5. Granting yourself the admin role

The `/admin` panel is gated by the `admin` role in the `user_roles` table.
After signing into ArtStage once, grant yourself the role via SQL:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'you@example.com';
```
