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
 * Lints a copy of the fixture project with the built plugin, giving the rule `ruleOptions`, and returns the plugin's
 * diagnostics, one line each, sorted. Lint a copy, because the config file has to sit beside the project.
 */
const lintFixture = async (ruleOptions: Record<string, unknown> = {}): Promise<string[]> => {
  const directory = await makeTempDir()
  await cp(PROJECT_DIRECTORY, directory, { recursive: true })
  const config = {
    jsPlugins: [PLUGIN_PATH],
    rules: {
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
  it("should report every runtime import of code that uses the importer's own package, and nothing outside the root", async () => {
    expect(await lintFixture()).toStrictEqual([
      "src/app/feature/part.ts:1:1: 'app/app.ts' uses package 'app/feature', which holds this module. Import only types from it, or move what this module needs into shared code that doesn't use 'app/feature'. [Error/package-boundaries(no-upward-imports)]",
      "src/app/feature/part.ts:4:1: 'uses-app.ts' uses package 'app', which holds this module. Import only types from it, or move what this module needs into shared code that doesn't use 'app'. [Error/package-boundaries(no-upward-imports)]",
    ])
  })

  it("should treat the folder the root option names as the root package", async () => {
    expect(await lintFixture({ root: "src/app" })).toStrictEqual([
      "src/app/feature/part.ts:1:1: 'app.ts' uses package 'feature', which holds this module. Import only types from it, or move what this module needs into shared code that doesn't use 'feature'. [Error/package-boundaries(no-upward-imports)]",
    ])
  })
})
