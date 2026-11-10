import path from "node:path"

import type { Context, RuleOptionsSchema } from "@oxlint/plugins"

import { findPackageDirectory } from "#imports/imports.ts"

// Hold the root package in `src/`, which most projects keep their code in, beside `package.json`.
const DEFAULT_ROOT = "src"

/** The options both rules take: `root`, the folder that holds the root package, relative to `package.json`. */
export const OPTIONS_SCHEMA: RuleOptionsSchema = [
  {
    type: "object",
    properties: { root: { type: "string" } },
    additionalProperties: false,
  },
]

/** Returns the `root` option, or the default when the rule wasn't given one. */
const readRootOption = (options: Context["options"]): string => {
  const [ruleOptions] = options
  const isOptionsObject = typeof ruleOptions === "object" && ruleOptions !== null && !Array.isArray(ruleOptions)
  const root = isOptionsObject ? ruleOptions["root"] : undefined
  return typeof root === "string" ? root : DEFAULT_ROOT
}

/** Returns the folder that holds the root package for the file being linted, or `undefined` outside any project. */
export const getRootDirectory = (context: Context): string | undefined => {
  const packageDirectory = findPackageDirectory(context.filename)
  return packageDirectory && path.join(packageDirectory, readRootOption(context.options))
}
