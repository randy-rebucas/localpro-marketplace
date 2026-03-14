import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/payment-return?to=/client/escrow%3FjobId%3D...%26payment%3Dsuccess
 *
 * Same-site bounce redirect for external payment gateways (PayMongo, PayPal, etc.).
 *
 * Problem: PayMongo redirects the user back to our domain after checkout.
 * That redirect is a cross-site navigation, so browsers strip SameSite=Strict
 * (and even SameSite=Lax on some older browsers / certain flows) cookies —
 * the middleware sees no access_token and bounces to /login.
 *
 * Solution: make the payment gateway's successUrl point here instead.
 * This route returns a tiny HTML page that immediately JS-redirects to `to`.
 * The JS-triggered navigation is same-site, so cookies are always sent.
 *
 * Security notes:
 * – `to` is validated to only allow relative paths on this origin.
 * – No auth check is performed here (intentionally — this is a public bounce).
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const to = searchParams.get("to") ?? "/client/escrow";

  // Validate: only allow relative paths (prevents open-redirect to external URLs)
  const safeTo = to.startsWith("/") && !to.startsWith("//") ? to : "/client/escrow";

  // Return a minimal HTML page that immediately redirects client-side.
  // The browser follows this as a same-site navigation → cookies are sent.
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${safeTo}">
  <title>Redirecting…</title>
  <script>window.location.replace(${JSON.stringify(safeTo)});</script>
</head>
<body>
  <p>Redirecting… <a href="${safeTo}">Click here if not redirected.</a></p>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Prevent this bounce page from being cached
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
