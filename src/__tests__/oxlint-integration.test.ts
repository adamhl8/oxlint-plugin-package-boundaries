import { beforeAll, describe, expect, it } from "bun:test"
import { cp } from "node:fs/promises"
import path from "node:path"

import { makeTempDir } from "@adamhl8/configs/test"
import bun, { $ } from "bun"

import { PROJECT_DIRECTORY } from "#__tests__/project.ts"
import plugin from "#index.ts"

const REPO_DIRECTORY = path.resolve(import.meta.dir, "../..")
const PLUGIN_PATH = path.join(REPO_DIRECTORY, "dist/index.js")
const OXLINT_BIN = path.join(REPO_DIRECTORY, "node_modules/.bin/oxlint")
const TSDOWN_BIN = path.join(REPO_DIRECTORY, "node_modules/.bin/tsdown")

const RULE_PREFIX = "package-boundaries("

const MUTUAL_FIX =
  "Pass the value in instead of importing it, move the module to the package it belongs to, or move what both need into a package beside them."

/**
 * Lints a copy of the fixture project with the built plugin, every rule on, and `settings` under `package-boundaries`.
 * Lint a copy, because the config file has to sit beside the project.
 */
const runOxlint = async (settings: Record<string, unknown> = {}, format = "unix") => {
  const directory = await makeTempDir()
  await cp(PROJECT_DIRECTORY, directory, { recursive: true })
  const rules = Object.fromEntries(Object.keys(plugin.rules).map((rule) => [`package-boundaries/${rule}`, "error"]))
  const config = { jsPlugins: [PLUGIN_PATH], rules, settings: { "package-boundaries": settings } }
  await bun.write(path.join(directory, ".oxlintrc.json"), JSON.stringify(config))

  // Read the output whatever the exit code, because oxlint exits non-zero when it finds problems.
  // Pin the format, because oxlint switches to a compact format when it detects an AI agent.
  return $`${OXLINT_BIN} --format=${format}`.cwd(directory).nothrow().quiet()
}

/** Returns the plugin's diagnostics for the fixture project, one line each, sorted. */
const lintFixture = async (settings: Record<string, unknown> = {}): Promise<string[]> => {
  const output = await runOxlint(settings)
  return output
    .text()
    .split("\n")
    .filter((line) => line.includes(RULE_PREFIX))
    .toSorted()
}

beforeAll(async () => {
  // Build first, because oxlint loads the plugin from `dist/`.
  await $`${TSDOWN_BIN}`.cwd(REPO_DIRECTORY).quiet()
})

describe("the plugin in oxlint", () => {
  it("should report what each rule finds, leave test code and type-only imports out, and skip what's outside the root", async () => {
    expect(await lintFixture()).toStrictEqual([
      "src/app/feature/part.ts:1:1: 'app/feature.ts' uses package 'app/feature', which holds this module. Import only types from it, or move what this module needs into shared code that doesn't use 'app/feature'. [Error/package-boundaries(no-upward-imports)]",
      "src/app/feature/part.ts:4:1: 'uses-app.ts' uses package 'app', which holds this module. Import only types from it, or move what this module needs into shared code that doesn't use 'app'. [Error/package-boundaries(no-upward-imports)]",
      "src/app/helper.test.ts:1:1: 'app/helper.test.ts' is a test outside a '__tests__' folder. Move it into the '__tests__' folder beside the module it tests. [Error/package-boundaries(require-tests-folder)]",
      "src/app/uses-index.ts:1:1: 'index.ts' is an entry point. Import from the module that declares what you need. [Error/package-boundaries(no-index-imports)]",
      `src/app/uses-lib.ts:4:1: 'lib/lib.ts' is in package 'lib', which imports 'app' at runtime: 'lib/greet.ts' imports 'app/helper.ts'. ${MUTUAL_FIX} [Error/package-boundaries(no-mutual-imports)]`,
      `src/app/uses-lib.ts:6:1: 'lib/lib.ts' is in package 'lib', which imports 'app' at runtime: 'lib/greet.ts' imports 'app/helper.ts'. ${MUTUAL_FIX} [Error/package-boundaries(no-mutual-imports)]`,
      `src/lib/greet.ts:1:1: 'app/helper.ts' is in package 'app', which imports 'lib' at runtime: 'app/uses-lib.ts' imports 'lib/lib.ts'. ${MUTUAL_FIX} [Error/package-boundaries(no-mutual-imports)]`,
      "src/lib/lib-types.ts:1:1: 'lib/lib-types.ts' repeats its folder's name. Drop it from the file name: 'lib/types.ts'. [Error/package-boundaries(no-folder-name-prefix)]",
      "src/lib/lib.ts:1:1: 'lib/lib.ts' is named after its folder. Move it beside the folder as 'lib.ts', or rename it for what it holds. [Error/package-boundaries(no-folder-named-modules)]",
    ])
  })

  it("should treat the folder the root setting names as the root package", async () => {
    expect(await lintFixture({ root: "src/app" })).toStrictEqual([
      "src/app/feature/part.ts:1:1: 'feature.ts' uses package 'feature', which holds this module. Import only types from it, or move what this module needs into shared code that doesn't use 'feature'. [Error/package-boundaries(no-upward-imports)]",
      "src/app/helper.test.ts:1:1: 'helper.test.ts' is a test outside a '__tests__' folder. Move it into the '__tests__' folder beside the module it tests. [Error/package-boundaries(require-tests-folder)]",
    ])
  })

  it("should find tests and test code in the folder the testsFolder setting names", async () => {
    const diagnostics = await lintFixture({ testsFolder: "tests" })

    expect(diagnostics.filter((line) => line.startsWith("src/app/__tests__/"))).toStrictEqual([
      "src/app/__tests__/helper.test.ts:1:1: 'app/__tests__/helper.test.ts' is a test outside a 'tests' folder. Move it into the 'tests' folder beside the module it tests. [Error/package-boundaries(require-tests-folder)]",
      "src/app/__tests__/setup.ts:1:1: 'index.ts' is an entry point. Import from the module that declares what you need. [Error/package-boundaries(no-index-imports)]",
    ])
  })

  it("should fail the lint, naming the setting, for a setting it can't use", async () => {
    // Read JSON, because the unix format leaves out the message of an error a plugin throws.
    const output = await runOxlint({ root: 5 }, "json")

    expect([
      output.exitCode,
      output.text().includes("The package-boundaries setting 'root' must be a non-empty string."),
    ]).toStrictEqual([1, true])
  })
})
