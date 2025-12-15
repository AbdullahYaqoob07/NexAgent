# Payment SDKs Setup (EasyPaisa, JazzCash, SadaPay, Stripe placeholder factors)

This doc lists what you need to collect and the env vars to add for each provider so the front-end modals can be wired to real services later.

## EasyPaisa
- **What to obtain**
  - Merchant ID / Account ID
  - API Key / Secret
  - Callback / Webhook URL (use your public HTTPS endpoint)
  - Sandbox credentials (if available)
- **Recommended env**
  - `EASYPaisa_MERCHANT_ID=`
  - `EASYPaisa_API_KEY=`
  - `EASYPaisa_API_SECRET=`
  - `EASYPaisa_BASE_URL=https://sandbox.easypaisa.com.pk` (swap to prod when live)
  - `EASYPaisa_WEBHOOK_SECRET=` (if webhook signing is supported)

## JazzCash
- **What to obtain**
  - Merchant ID / PP_MerchantID
  - Password / Integrity Salt
  - Return URL & Webhook URL
  - Sandbox credentials
- **Recommended env**
  - `JAZZCASH_MERCHANT_ID=`
  - `JAZZCASH_PASSWORD=`
  - `JAZZCASH_INTEGRITY_SALT=`
  - `JAZZCASH_RETURN_URL=https://yourapp.com/api/payments/jazzcash/return`
  - `JAZZCASH_WEBHOOK_SECRET=` (if provided)
  - `JAZZCASH_BASE_URL=https://sandbox.jazzcash.com.pk` (swap to prod when live)

## SadaPay
- **What to obtain**
  - Client ID / Client Secret (OAuth)
  - API Base URL (sandbox vs prod)
  - Webhook signing secret
  - Redirect URI (if OAuth/3DS flow)
- **Recommended env**
  - `SADAPAY_CLIENT_ID=`
  - `SADAPAY_CLIENT_SECRET=`
  - `SADAPAY_BASE_URL=https://sandbox-api.sadapay.pk`
  - `SADAPAY_WEBHOOK_SECRET=`
  - `SADAPAY_REDIRECT_URI=https://yourapp.com/api/payments/sadapay/callback`

## Common env for payment flows
- `NEXT_PUBLIC_APP_URL=` (frontend base, already used by Stripe)
- `PAYMENT_WEBHOOK_SECRET=` (if you standardize webhook verification)

## Stripe (already present)
- `STRIPE_SECRET_KEY=`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=`
- `STRIPE_WEBHOOK_SECRET=` (if you configure webhooks)

## Next steps to integrate
1) Add the env vars above into `.env.local` (do not commit secrets).
2) Implement backend routes:
   - Create transaction intent / order with each provider
   - Confirm payment and verify signature/hash
   - Handle webhooks to mark payments succeeded/failed
3) Wire the modals:
   - Call your backend to create payment sessions/intents
   - Poll/redirect/confirm based on provider flow
4) Persist transaction + integration activation logic after successful payment.

