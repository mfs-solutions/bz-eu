# BZEAD EU

European BZEAD buyer storefront using the shared Supabase marketplace backend.
The EU build displays EUR and limits checkout delivery addresses to European countries.
EU hosted checkout is enabled by default; set `VITE_EU_HOSTED_CHECKOUT=false`
to disable it at build time. The backend also requires
`EU_HOSTED_CHECKOUT_ENABLED=true`. A complete live EUR payment and recovery
have not yet been verified.

`npm run dev` and `npm run build:buyer` use the EU market; `npm run dev:uk`
and `npm run build:uk` retain the UK configuration. Set `VITE_PUBLIC_APP_URL`
and the required public Supabase configuration for production builds.

See [APP_DOCUMENTATION.md](./asset/APP_DOCUMENTATION.md) for the original UK
application architecture and backend context.
