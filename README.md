# @adamhl8/oxlint-plugin-package-boundaries

An [oxlint](https://oxc.rs/docs/guide/usage/linter) plugin that enforces package boundaries and a module layout in a TypeScript project. A package is a folder of related modules:

- [`no-upward-imports`](#no-upward-imports) -> never import, at runtime, code from a package that holds yours and uses yours
- [`no-mutual-imports`](#no-mutual-imports) -> two sibling packages never import each other at runtime
- [`no-index-imports`](#no-index-imports) -> never import an `index` file, which is an entry point
- [`no-folder-named-modules`](#no-folder-named-modules) -> never name a module after its own folder
- [`no-folder-name-prefix`](#no-folder-name-prefix) -> never start a module's name with its folder's name
- [`require-tests-folder`](#require-tests-folder) -> keep every test file in a tests folder

---

<!-- toc -->

- [The package model](#the-package-model)
  - [Test code](#test-code)
- [Installation](#installation)
- [Usage](#usage)
- [Rules](#rules)
  - [`no-upward-imports`](#no-upward-imports)
  - [`no-mutual-imports`](#no-mutual-imports)
  - [`no-index-imports`](#no-index-imports)
  - [`no-folder-named-modules`](#no-folder-named-modules)
  - [`no-folder-name-prefix`](#no-folder-name-prefix)
  - [`require-tests-folder`](#require-tests-folder)
- [Settings](#settings)

<!-- tocstop -->

## The package model

```text
src/
  index.ts               the published entry point
  utils.ts               shared code: several packages use it, and no package owns it
  session.ts             the module that package `session` belongs to
  session/
    step.ts              a module of package `session`
    handlers.ts          the module that `session/handlers`, a subpackage of `session`, belongs to
    handlers/
      file.ts            the module that `session/handlers/file` belongs to
      file/
        write.ts         a part split out of `file.ts`
        shared.ts        code that `file.ts` and `write.ts` share
```

- A package is a folder of related modules. Any module may import any other module, at any depth. The plugin doesn't decide what a package exposes.
- The module a package belongs to sits beside its folder, under the same name, like `file.ts` beside `file/`. It uses its package, so a module inside the folder can't import a value from it. That module imports only types from it, or the shared code moves into the folder, like `file/shared.ts`.
- A package can hold other packages. A module in `session/` may use `session/handlers/`, but a module in `session/handlers/` may not load, at runtime, a module in `session/` that uses `session/handlers/`.
- Shared code lives in the nearest package that holds every module that uses it. Any module inside that package may import it, as long as the shared code doesn't use the importer's own package.
- Modules in the same package may import each other. A cycle among them is the only runtime hazard, and oxlint's [`import/no-cycle`](https://oxc.rs/docs/guide/usage/linter/rules/import/no-cycle) reports it, so turn that rule on too.
- Two sibling packages depend on each other in one direction at runtime. Types may go both ways.
- An `index` file is an entry point, the only place re-exports belong. Code imports each name from the module that declares it.
- Each module is named for what it holds. A module never takes its folder's name, and a file inside a folder drops it: `file/write.ts`, not `file/file-write.ts`.
- A test lives in the `__tests__/` folder beside the module it tests.

### Test code

Test code is a test file, named `*.test.*` or `*.spec.*`, or anything in a tests folder, like a helper or a fixture project. A test may import any module, and nothing imports a test, so it can't take part in the order modules load in. So the three import rules skip test code, and `no-folder-named-modules` and `no-folder-name-prefix` skip it too, because a test takes its module's name and a fixture can copy any layout on purpose.

The tests folder counts anywhere in a file's path, so a fixture project with its own `package.json` inside `__tests__/` is test code too.

## Installation

```bash
bun add -D @adamhl8/oxlint-plugin-package-boundaries
```

This plugin targets [oxlint's JavaScript plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins), which are in alpha.

## Usage

Add the plugin to `jsPlugins` and enable the rules in your `.oxlintrc.json`. The rule prefix is `package-boundaries`. The rules leave test code out themselves, so tests need no override:

```json
{
  "jsPlugins": ["@adamhl8/oxlint-plugin-package-boundaries"],
  "rules": {
    "package-boundaries/no-upward-imports": "error",
    "package-boundaries/no-mutual-imports": "error",
    "package-boundaries/no-index-imports": "error",
    "package-boundaries/no-folder-named-modules": "error",
    "package-boundaries/no-folder-name-prefix": "error",
    "package-boundaries/require-tests-folder": "error"
  }
}
```

The import rules read relative imports and [subpath imports](https://nodejs.org/api/packages.html#subpath-imports) from the `imports` field in `package.json`. They ignore a package's specifier, like `node:fs` or `react`. Every rule ignores a module outside the root.

The rules that check a file's name report on its first statement, so a truly exceptional case can still be suppressed with an `oxlint-disable-next-line` comment above it.

## Rules

### `no-upward-imports`

A runtime import must not load code from a package that holds the importer's own package, when that code uses the importer's package, because ESM settles the cycle by load order, and a value read before it's set fails at runtime. A type-only import is fine, because TypeScript removes it.

In `src/app/feature/part.ts`:

```ts
import { feature } from "#app/feature.ts" // error: `app/feature.ts` uses `app/feature`, which holds this module
import type { Feature } from "#app/feature.ts" // ok: type-only
import { sibling } from "#app/feature/sibling.ts" // ok: the same package
import { helper } from "#app/helper.ts" // ok: shared code that doesn't use `app/feature`
```

It follows runtime imports at any depth, through relative and subpath imports, to find what a module uses. It leaves out a dynamic `import()`, because that loads later.

### `no-mutual-imports`

Two sibling packages, where neither holds the other, must not import each other at runtime. When `app/` loads `lib/` and `lib/` loads `app/`, neither can be understood or tested alone, and nothing says which one drives the other. A type-only import is fine, because types are shared vocabulary, not behavior.

```ts
// src/lib/greet.ts
import { helper } from "#app/helper.ts" // error: `app/` imports `lib/` at runtime, in `app/uses-lib.ts`
// src/app/uses-lib.ts
import { lib } from "#lib/value.ts" // error: `lib/` imports `app/` at runtime, in `lib/greet.ts`
```

Each side is reported, and the message names one import going back as evidence. There are three ways out: pass the value in instead of importing it, move the module to the package it belongs to, or move what both need into a package beside them.

A cycle between files is already `import/no-cycle`'s to report. This rule reports two packages tied together even when no cycle runs between their files.

### `no-index-imports`

An `index` file is an entry point that re-exports what other modules declare. Importing it hides where a name comes from, and loads every module it re-exports. Import from the module that declares the name instead. This covers type-only imports too.

```ts
import type { App } from "#app.ts" // ok: the module that declares it
import type { App } from "#index.ts" // error: `index.ts` is an entry point
```

### `no-folder-named-modules`

A module must not take its own folder's name. The module a folder belongs to sits beside it, under the same name, like `shell.ts` beside `shell/`. The rule compares the name up to its first dot, so it reports `bask/bask.base.ts` as well as `shell/shell.ts`.

```text
shell/shell.ts       error: move it beside the folder as `shell.ts`, or rename it for what it holds
bask/bask.base.ts    error: move it beside the folder as `bask.base.ts`
shell.ts             ok
shell/run.ts         ok
```

When a module in a folder of peers wants the folder's name, the folder's name is usually too narrow. Rename the folder.

### `no-folder-name-prefix`

A file inside a folder drops the folder's name, because the path already says it.

```text
imports/imports-map.ts    error: name it `imports/map.ts`
settings/settings-db.ts   error: name it `settings/db.ts`
imports/map.ts            ok
```

### `require-tests-folder`

A test file, named `*.test.*` or `*.spec.*`, must sit in a tests folder: the `__tests__/` beside the module it tests. A test of one part of a module sits in the tests folder inside that module's folder.

```text
src/parser.test.ts                    error: move it into `src/__tests__/`
src/__tests__/parser.test.ts          ok
src/parser/__tests__/lexer.test.ts    ok
```

## Settings

The rules read their settings from oxlint's shared `settings`, under `package-boundaries`, so each one is set once for every rule:

- `root: string` (default `"src"`) - the folder that holds the root package, relative to the nearest `package.json`.
- `testsFolder: string` (default `"__tests__"`) - the name of the folders that hold tests and their helpers. It's a folder name, not a path.

```json
{
  "settings": {
    "package-boundaries": { "root": "lib", "testsFolder": "tests" }
  }
}
```

A setting the plugin can't use, like an empty string or a path for `testsFolder`, fails the lint with a message that names it.
