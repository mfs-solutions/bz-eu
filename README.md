# BZEAD EU

European BZEAD buyer storefront using the shared Supabase marketplace backend.
The EU build displays EUR and uses active entries in `EU_COUNTRIES` for delivery address selection.
The table is initialized from `countries` and maintained separately; its exchange
rates and other copied fields do not automatically follow changes to `countries`.
The Bulgaria row uses EUR, correcting the outdated currency in `countries`.
Checkout pricing continues to use the exchange rates in `countries`.
EU hosted checkout is enabled by default; set `VITE_EU_HOSTED_CHECKOUT=false`
to disable it at build time. The backend also requires
`EU_HOSTED_CHECKOUT_ENABLED=true`. A complete live EUR payment and recovery
have not yet been verified.

The product-page "Use my current location" option asks the buyer for browser
location permission, then the `detect-postcode` edge function (Geoapify reverse
geocoding, secret `GEOAPIFY_API_KEY`) returns the postcode. Locations outside
`EU_COUNTRIES` are rejected and buyers can enter a postcode manually. Free-tier
use requires "Powered by Geoapify" attribution.

`npm run dev` and `npm run build:buyer` use the EU market; `npm run dev:uk`
and `npm run build:uk` retain the UK configuration. Set `VITE_PUBLIC_APP_URL`
and the required public Supabase configuration for production builds.

See [APP_DOCUMENTATION.md](./asset/APP_DOCUMENTATION.md) for the original UK
application architecture and backend context.
