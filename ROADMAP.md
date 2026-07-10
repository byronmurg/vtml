# Roadmap

Ideas that are agreed on in principle but not yet implemented.

## `<v-cors>`

VTML has no CORS handling today. By default that's fine — CORS only constrains
browser-initiated cross-origin requests (a page's JS calling `fetch`/`XHR`
against another origin), and most VTML apps don't have that shape since pages
and their `/_api` endpoints are served from the same origin.

It becomes relevant when a browser-hosted client on a *different* origin needs
to call into a VTML app's `/_api` — a widget embedded on another site, or a
separately-hosted frontend calling back to the VTML API. Non-browser
consumers (scripts, curl, another backend service, native mobile apps) are
never affected by CORS, so this is specifically about that browser-cross-origin
case.

Proposed direction: a `<v-cors>` tag to declare allowed origins for the
generated API routes, rather than baking CORS into the framework by default.

Status: idea stage, not designed or implemented yet. Needs testing before
committing to a shape.
