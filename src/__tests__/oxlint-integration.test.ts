import { beforeAll, describe, expect, it } from "bun:test"
import { cp } from "node:fs/promises"
import path from "node:path"

import { makeTempDir } from "@adamhl8/configs/test"
import bun, { $ } from "bun"

import { PROJECT_DIRECTORY } from "#__tests__/project.ts"

const REPO_DIRECTORY = path.resolve(import.meta.dir, "../..")
const PLUGIN_PATH = path.join(REPO_DIRECTORY, "dist/index.js")
const OXLINT_BIN = path.join(REPO_DIRECTORY, "node_modules/.bin/oxlint")
const TSDOWN_BIN = path.join(REPO_DIRECTORY, "node_modules/.bin/tsdown")

const RULE_PREFIX = "package-boundaries("

/**
 * Lints a copy of the fixture project with the built plugin, giving both rules `ruleOptions`, and returns the plugin's
 * diagnostics, one line each, sorted. Lint a copy, because the config file has to sit beside the project.
 */
const lintFixture = async (ruleOptions: Record<string, unknown> = {}): Promise<string[]> => {
  const directory = await makeTempDir()
  await cp(PROJECT_DIRECTORY, directory, { recursive: true })
  const config = {
    jsPlugins: [PLUGIN_PATH],
    rules: {
      "package-boundaries/no-deep-imports": ["error", ruleOptions],
      "package-boundaries/no-upward-imports": ["error", ruleOptions],
    },
  }
  await bun.write(path.join(directory, ".oxlintrc.json"), JSON.stringify(config))

  // Read the output whatever the exit code, because oxlint exits non-zero when it finds problems.
  // Pin `--format=unix`, because oxlint switches to a compact format when it detects an AI agent.
  const output = await $`${OXLINT_BIN} --format=unix`.cwd(directory).nothrow().quiet().text()
  return output
    .split("\n")
    .filter((line) => line.includes(RULE_PREFIX))
    .toSorted()
}

beforeAll(async () => {
  // Build first, because oxlint loads the plugin from `dist/`.
  await $`${TSDOWN_BIN}`.cwd(REPO_DIRECTORY).quiet()
})

describe("the plugin in oxlint", () => {
  it("should report every import that breaks a package boundary, and nothing outside the root", async () => {
    expect(await lintFixture()).toStrictEqual([
      "src/app/feature/part.ts:1:1: 'app/app.ts' uses package 'app/feature', which holds this module. Import only types from it, or move what this module needs into shared code that doesn't use 'app/feature'. [Error/package-boundaries(no-upward-imports)]",
      "src/app/feature/part.ts:3:1: 'app/feature/feature.ts' is the main module of this module's own package, and it uses this package. Import from the module that declares what you need, or import only types. [Error/package-boundaries(no-upward-imports)]",
      "src/app/feature/part.ts:5:1: 'uses-app.ts' uses package 'app', which holds this module. Import only types from it, or move what this module needs into shared code that doesn't use 'app'. [Error/package-boundaries(no-upward-imports)]",
      "src/app/uses-lib.ts:12:1: 'lib/nested/nested.ts' is inside package 'lib'. Import it through that package's main module, 'lib/lib.ts'. [Error/package-boundaries(no-deep-imports)]",
      "src/app/uses-lib.ts:4:1: 'app/feature/part.ts' is inside package 'app/feature'. Import it through that package's main module, 'app/feature/feature.ts'. [Error/package-boundaries(no-deep-imports)]",
      "src/app/uses-lib.ts:5:1: 'lib/internal.ts' is inside package 'lib'. Import it through that package's main module, 'lib/lib.ts'. [Error/package-boundaries(no-deep-imports)]",
      "src/app/uses-lib.ts:7:1: 'lib/nested/deep.ts' is inside package 'lib'. Import it through that package's main module, 'lib/lib.ts'. [Error/package-boundaries(no-deep-imports)]",
      "src/app/uses-lib.ts:8:1: 'lib/nested/nested.ts' is inside package 'lib'. Import it through that package's main module, 'lib/lib.ts'. [Error/package-boundaries(no-deep-imports)]",
      "src/app/uses-lib.ts:9:1: 'lib/internal.ts' is inside package 'lib'. Import it through that package's main module, 'lib/lib.ts'. [Error/package-boundaries(no-deep-imports)]",
    ])
  })

  it("should treat the folder the root option names as the root package", async () => {
    expect(await lintFixture({ root: "src/app" })).toStrictEqual([
      "src/app/feature/part.ts:1:1: 'app.ts' uses package 'feature', which holds this module. Import only types from it, or move what this module needs into shared code that doesn't use 'feature'. [Error/package-boundaries(no-upward-imports)]",
      "src/app/feature/part.ts:3:1: 'feature/feature.ts' is the main module of this module's own package, and it uses this package. Import from the module that declares what you need, or import only types. [Error/package-boundaries(no-upward-imports)]",
      "src/app/uses-lib.ts:4:1: 'feature/part.ts' is inside package 'feature'. Import it through that package's main module, 'feature/feature.ts'. [Error/package-boundaries(no-deep-imports)]",
    ])
  })
})
