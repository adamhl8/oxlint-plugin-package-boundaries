# @adamhl8/oxlint-plugin-package-boundaries

An [oxlint](https://oxc.rs/docs/guide/usage/linter) plugin that enforces package boundaries in a TypeScript project. A package is a folder of related modules, and its main module, the one named after the folder, is its public surface:

- [`no-deep-imports`](#no-deep-imports) -> import another package only through its main module
- [`no-upward-imports`](#no-upward-imports) -> never import, at runtime, code that uses your own package

---

<!-- toc -->

- [The package model](#the-package-model)
- [Installation](#installation)
- [Usage](#usage)
- [Rules](#rules)
  - [`no-deep-imports`](#no-deep-imports)
  - [`no-upward-imports`](#no-upward-imports)
- [Options](#options)

<!-- tocstop -->

## The package model

```text
src/
  index.ts               the root package's main module, the published entry point
  utils.ts               shared code: several packages use it, and no package owns it
  session/
    session.ts           the main module of package `session`
    step.ts              a module inside `session`
    handlers/
      handlers.ts        the main module of `session/handlers`, a subpackage of `session`
      file/
        file.ts          the main module of `session/handlers/file`
        write.ts
```

- A package is a folder of related modules. Its main module is named after it, like `session/session.ts`, and is its public surface: modules outside the package import only from that file. The root package, `src/`, uses `index.ts`.
- A package can hold other packages. A module sees its own package, the packages beside it, and the packages beside each package that holds it. It reaches any of them through the outermost package it can see, and that package's main module.
- Shared code lives in the nearest package that holds every module that uses it. Any module inside that package may import it, as long as the shared code doesn't use the importer's own package.

## Installation

```bash
bun add -D @adamhl8/oxlint-plugin-package-boundaries
```

This plugin targets [oxlint's JavaScript plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins), which are in alpha.

## Usage

Add the plugin to `jsPlugins` and enable the rules in your `.oxlintrc.json`. The rule prefix is `package-boundaries`. Turn the rules off for tests, because a test may import any module:

```json
{
  "jsPlugins": ["@adamhl8/oxlint-plugin-package-boundaries"],
  "rules": {
    "package-boundaries/no-deep-imports": "error",
    "package-boundaries/no-upward-imports": "error"
  },
  "overrides": [
    {
      "files": ["**/__tests__/**"],
      "rules": {
        "package-boundaries/no-deep-imports": "off",
        "package-boundaries/no-upward-imports": "off"
      }
    }
  ]
}
```

The rules read relative imports and [subpath imports](https://nodejs.org/api/packages.html#subpath-imports) from the `imports` field in `package.json`. They ignore a package's specifier, like `node:fs` or `react`, and a module outside the root.

## Rules

### `no-deep-imports`

An import of another package must go through the main module of the package the importer can see. Type-only imports count too, because a type is part of a package's public surface.

```ts
import { part } from "#app/feature/part.ts" // error: import it through `app/feature/feature.ts`
import { internal } from "#lib/internal.ts" // error: import it through `lib/lib.ts`
// src/app/app.ts
import { lib } from "#lib/lib.ts" // ok: the main module of `lib`
import { nested } from "#lib/nested/nested.ts" // error: `lib/nested` is inside `lib`, so import it through `lib/lib.ts`
```

### `no-upward-imports`

A runtime import must not load code that uses the importer's own package, because ESM settles the cycle by load order, and a value read before it's set fails at runtime. A type-only import is fine, because TypeScript removes it.

```ts
import { feature } from "#app/app.ts" // error: `app/app.ts` uses `app/feature`, which holds this module
import type { Feature } from "#app/app.ts" // ok: type-only
import { part } from "#app/feature/feature.ts" // error: the main module of its own package, which uses the package
// src/app/feature/part.ts
import { helper } from "#app/helper.ts" // ok: shared code that doesn't use `app/feature`
```

It follows runtime imports at any depth, through relative and subpath imports, to find what a module uses. It leaves out a dynamic `import()`, because that loads later.

## Options

Both rules take the same option:

- `root: string` (default `"src"`) - the folder that holds the root package, relative to the nearest `package.json`.

```json
{ "package-boundaries/no-deep-imports": ["error", { "root": "lib" }] }
```
