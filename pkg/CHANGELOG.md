# Changelog

All notable changes to the `@vtml/vtml` package are documented here. The
format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Versioning

VTML is pre-1.0 (see the status note in the [README](../README.md)). Per
[semver's pre-release rule](https://semver.org/#spec-item-4), any `0.x`
release may contain breaking changes — a `0.5.x -> 0.6.0` bump, or even a
patch release, isn't guaranteed to be backwards compatible yet.

Once VTML reaches 1.0 it will follow semver properly:

- **major** — breaking changes to documented tags or behavior
- **minor** — new tags or features, backwards compatible
- **patch** — bug fixes only

This file starts at `0.5.11`. Earlier releases weren't tracked in a
changelog and aren't being reconstructed retroactively — see `git log` for
that history.

## [Unreleased]

## [0.5.12] - 2026-07-10

### Fixed

- **A bug or a routine request (a form post with no `Referer` header, an SQL
  error) could crash the entire server**, not just fail the one request.
  Route handlers didn't catch thrown/rejected errors, so they became
  unhandled promise rejections; separately, sqlite errors during query
  preparation surfaced as an unhandled `error` event instead of a rejection.
  Both now resolve to a normal error response.
- `redirectOrReturn` (used to send a form submitter back where they came
  from) threw when there was no `Referer` header — very common for
  non-browser clients — instead of falling back to `/`.
- Uncaught Express-level errors (a malformed JSON body, an oversized
  payload, an unsupported charset, a file-upload error from multer) were
  always reported as `500`. The real status set by the underlying
  middleware (`400`, `413`, `415`, etc) is now used, with genuinely
  unexpected errors still falling back to `500`.

### Added

- The generated OpenAPI schema now defines all form error responses
  (`400`/`401`/`403`/`404`/`413`/`415`/`500`) under `components.responses`
  and references them from each path, instead of a partial, inlined set.

## [0.5.11] - previously released

No changelog entry — see `git log` for this and earlier releases.
