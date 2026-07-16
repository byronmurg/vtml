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

## Interactive onboarding (`vtml` with no args, `--template`)

Bare `vtml` in a TTY should show a menu (new app / scaffold from a DB / run
a file) instead of erroring; `--template` should prompt instead of just
stamping a name into one fixed page. Priority: lowers the barrier for
first-time users, ahead of collecting outside feedback.

Rules: TTY-gate all prompts, keep a flag-driven equivalent for scripts, and
keep this confined to generation commands — `--dev`/`--validate`/normal
execution stay scriptable.

Library: `prompts` or `enquirer` (both CommonJS, no build friction).
`@clack/prompts` looks nicer but is ESM-only.

Status: idea stage. Should land alongside auditing the other DB drivers for
the same unhandled-error crash class fixed in 0.5.12, not instead of it.

## CRUD scaffold from an existing database schema

The current `vtml --template <name>` only stamps a name into one fixed
starter page — it doesn't reflect anything about a real project. Since VTML
already has the building blocks (`<v-sql>`, auto-validated forms, schema
introspection is just a query away), a `vtml` subcommand could point at a
`DB_URL`, introspect the schema, and generate real `.vtml` pages: a listing
page and a create/edit form per table, with `type`/`required`/`maxlength`
inferred from actual column types.

This is deliberately *not* a general "static data can drive document
structure" language feature (that path was considered and rejected — see
below). It's a one-shot generator: introspect once, emit plain static
`.vtml` text, and hand it back to a human to edit like any other file. The
interpreter's execution model doesn't change at all.

Explicit non-goal: the scaffold should never guess at auth. Generated pages
stay purely structural (tables → pages/forms/validation); adding
`<v-check-authenticated>` etc. stays a deliberate manual step, same as the
auth tutorial today.

Rejected alternative: letting some data-source tags be marked "static"
(run once at startup) so their output could drive structural, request-time
things like `<input name=...>` — which normally must be statically known
since it determines the generated JSON Schema. This would require a real
two-phase compiler (expand structure from static data, then parse/validate
the result), which adds a lot of surface area and footguns for authors
crossing the static/dynamic boundary. Deferred indefinitely in favor of the
generator approach above.

Open question for later, not blocking: whether this eventually replaces
`--template` as the default onboarding path or sits alongside it.

Status: idea stage, no design work started.
