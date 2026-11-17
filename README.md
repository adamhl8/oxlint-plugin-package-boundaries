# @adamhl8/oxlint-plugin-package-boundaries

An [oxlint](https://oxc.rs/docs/guide/usage/linter) plugin that enforces package boundaries in a TypeScript project. A package is a folder of related modules, and a module must never load, at runtime, code from a package that holds its own and uses it:

- [`no-upward-imports`](#no-upward-imports) -> never import, at runtime, code from a package that holds yours and uses yours

---

<!-- toc -->

- [The package model](#the-package-model)
- [Installation](#installation)
- [Usage](#usage)
- [Rules](#rules)
  - [`no-upward-imports`](#no-upward-imports)
- [Options](#options)

<!-- tocstop -->

## The package model

```text
src/
  index.ts               the published entry point
  utils.ts               shared code: several packages use it, and no package owns it
  session/
    session.ts           a module of package `session`
    step.ts
    handlers/
      handlers.ts        a module of `session/handlers`, a subpackage of `session`
      file/
        file.ts          a module of `session/handlers/file`
        write.ts
```

- A package is a folder of related modules. Any module may import any other module, at any depth. The plugin doesn't decide what a package exposes.
- A package can hold other packages. A module in `session/` may use `session/handlers/`, but a module in `session/handlers/` may not load, at runtime, a module in `session/` that uses `session/handlers/`.
- Shared code lives in the nearest package that holds every module that uses it. Any module inside that package may import it, as long as the shared code doesn't use the importer's own package.
- Modules in the same package may import each other. A cycle among them is the only runtime hazard, and oxlint's [`import/no-cycle`](https://oxc.rs/docs/guide/usage/linter/rules/import/no-cycle) reports it, so turn that rule on too.

## Installation

```bash
bun add -D @adamhl8/oxlint-plugin-package-boundaries
```

This plugin targets [oxlint's JavaScript plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins), which are in alpha.

## Usage

Add the plugin to `jsPlugins` and enable the rule in your `.oxlintrc.json`. The rule prefix is `package-boundaries`. Turn the rule off for tests. A test may import code that uses the package it's in, and nothing imports a test, so it can't start a cycle:

```json
{
  "jsPlugins": ["@adamhl8/oxlint-plugin-package-boundaries"],
  "rules": {
    "package-boundaries/no-upward-imports": "error"
  },
  "overrides": [
    {
      "files": ["**/__tests__/**"],
      "rules": {
        "package-boundaries/no-upward-imports": "off"
      }
    }
  ]
}
```

The rule reads relative imports and [subpath imports](https://nodejs.org/api/packages.html#subpath-imports) from the `imports` field in `package.json`. It ignores a package's specifier, like `node:fs` or `react`, and a module outside the root.

## Rules

### `no-upward-imports`

A runtime import must not load code from a package that holds the importer's own package, when that code uses the importer's package, because ESM settles the cycle by load order, and a value read before it's set fails at runtime. A type-only import is fine, because TypeScript removes it.

In `src/app/feature/part.ts`:

```ts
import { feature } from "#app/app.ts" // error: `app/app.ts` uses `app/feature`, which holds this module
import type { Feature } from "#app/app.ts" // ok: type-only
import { sibling } from "#app/feature/sibling.ts" // ok: the same package
import { helper } from "#app/helper.ts" // ok: shared code that doesn't use `app/feature`
```

It follows runtime imports at any depth, through relative and subpath imports, to find what a module uses. It leaves out a dynamic `import()`, because that loads later.

## Options

The rule takes one option:

- `root: string` (default `"src"`) - the folder that holds the root package, relative to the nearest `package.json`.

```json
{ "package-boundaries/no-upward-imports": ["error", { "root": "lib" }] }
```
