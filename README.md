# VTML

[![VTML Logo](https://vtml.org/assets/vtml_logo.svg)](https://vtml.org)

[![npm version](https://img.shields.io/npm/v/@vtml/vtml.svg)](https://www.npmjs.com/package/@vtml/vtml)
[![license](https://img.shields.io/npm/l/@vtml/vtml.svg)](LICENSE)

**VTML is a declarative web framework built directly into HTML.**

Instead of stitching together a router, a template engine, a validation library, and a
database client, you write plain HTML and sprinkle in `v-` tags. VTML reads that document
and takes care of routing, form handling and validation, database queries, conditional
logic, and partial re-rendering — all from the one file.

See **[vtml.org](https://vtml.org)** for the full documentation and getting-started guide.

```html
<h3>VTML is...</h3>
<v-nodejs target=$adjectives>
    return ["fast", "easy", "awesome"]
</v-nodejs>

<ul>
    <v-for-each $adjectives as=$adj>
        <li>$adj</li>
    </v-for-each>
</ul>
```

## Features

- **Inbuilt routing** — declare pages and nested pages with `<v-page>`, matched against the request path.
- **Automatic form endpoints** — a `<form v-name="...">` generates its own server-side route, with
  validation derived straight from the input elements.
- **Built-in SQL** — query PostgreSQL, MySQL/MariaDB or SQLite directly with `<v-sql>`.
- **Server-side JavaScript** — drop into Node.js at any point with `<v-nodejs>` when you need real logic.
- **Auth & authorization checks** — `<v-check-found>`, `<v-check-authenticated>` and
  `<v-check-authorized>` gate content (and whole endpoints) and set the right status codes.
- **Component isolation with portals** — `<v-portal>` lets part of a page be rendered and
  re-fetched independently, ideal for AJAX/HTMX-style updates.
- **Event streams** — `<v-subscribe>` / `<v-notify>` give you Server-Sent Events out of the box,
  backed by an in-memory queue or Redis.
- **Declarative async templating** — VTML works out the optimum order to run your tags
  (SQL queries, fetches, includes) so pages load as fast as possible.
- **Dev mode** — `vtml --dev` watches your files and restarts automatically.

## Installation & quick start

You'll need Node.js 20+.

```
npm -g i @vtml/vtml
vtml --template hello > hello.vtml
vtml hello.vtml
```

-- or, without installing globally --

```
npx @vtml/vtml --template hello > hello.vtml
npx @vtml/vtml hello.vtml
```

Then open http://localhost:3000. Use `vtml --dev hello.vtml` while developing so the
server restarts automatically as you edit the file.

## Repository layout

- [`pkg/`](pkg) — the `@vtml/vtml` package: the CLI, the rendering engine, and all built-in tags.
- [`docs/`](docs) — the source for [vtml.org](https://vtml.org), itself a VTML site. You can
  preview it locally with `vtml docs/index.html`.
- [`examples/`](examples) — sample `.vtml` pages demonstrating various features. Note that a few
  of these have drifted from the current syntax; the reference and tutorial docs on vtml.org are
  the more reliable source.

## Contributing

The CLI source lives under [`pkg/`](pkg). From that directory:

```
npm install
npm test    # run the jest test suite
npm run lint
```

## License

[MIT](LICENSE) © Byron Murgatroyd
