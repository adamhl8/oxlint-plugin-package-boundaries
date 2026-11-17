import path from "node:path"

import type { Context } from "@oxlint/plugins"

import { findPackageDirectory } from "#imports.ts"
import { isInTestsFolder, isTestFile, toModulePath } from "#layout.ts"

// Name the key the plugin's settings go under after the rule prefix.
const SETTINGS_KEY = "package-boundaries"

// Hold the root package in `src/`, which most projects keep their code in, beside `package.json`.
// Keep tests in `__tests__/` folders, the name Jest and Bun both look for.
const DEFAULT_SETTINGS = { root: "src", testsFolder: "__tests__" } as const

type SettingName = keyof typeof DEFAULT_SETTINGS

/** What every rule reads from the settings: the root package's folder, and the name of the folders that hold tests. */
export interface Settings {
  rootDirectory: string
  testsFolder: string
}

/** The file being linted, as a module of the root package, with the settings it's checked against. */
export interface LintedModule extends Settings {
  /** The module's path relative to the root, with `/` separators. */
  modulePath: string
  isInTestsFolder: boolean
  isTestCode: boolean
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** Returns one setting, or its default when it isn't set. Throws for a value the plugin can't use. */
const readSetting = (pluginSettings: Record<string, unknown>, name: SettingName): string => {
  const value = pluginSettings[name]
  if (value === undefined) return DEFAULT_SETTINGS[name]
  if (typeof value !== "string" || value === "")
    throw new Error(`The ${SETTINGS_KEY} setting '${name}' must be a non-empty string.`)
  if (name === "testsFolder" && value.includes("/"))
    throw new Error(`The ${SETTINGS_KEY} setting 'testsFolder' must be a folder name, not a path.`)
  return value
}

/**
 * Returns the settings for the file being linted, or `undefined` outside any project. Throws for settings the plugin
 * can't use, so a typo stops the lint instead of falling back to a default.
 */
export const readSettings = (context: Context): Settings | undefined => {
  const packageDirectory = findPackageDirectory(context.filename)
  if (packageDirectory === undefined) return undefined

  const pluginSettings = context.settings[SETTINGS_KEY] ?? {}
  if (!isRecord(pluginSettings)) throw new Error(`The ${SETTINGS_KEY} settings must be an object.`)

  return {
    rootDirectory: path.join(packageDirectory, readSetting(pluginSettings, "root")),
    testsFolder: readSetting(pluginSettings, "testsFolder"),
  }
}

/** Returns the file being linted as a module of the root package, or `undefined` for a file outside the root. */
export const readLintedModule = (context: Context): LintedModule | undefined => {
  const settings = readSettings(context)
  const modulePath = settings && toModulePath(settings.rootDirectory, context.filename)
  if (settings === undefined || modulePath === undefined) return undefined

  // Look for a tests folder in the file's whole path, not only the part inside the root.
  // A fixture project in a tests folder has its own `package.json`, so its root sits inside the tests folder.
  const filePath = context.filename.split(path.sep).join("/")
  const inTestsFolder = isInTestsFolder(filePath, settings.testsFolder)
  return { ...settings, modulePath, isInTestsFolder: inTestsFolder, isTestCode: inTestsFolder || isTestFile(filePath) }
}
