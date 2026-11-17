import fs from "node:fs"
import path from "node:path"

import { defineRule } from "@oxlint/plugins"

import { readRuntimeImports, visitImports } from "#imports.ts"
import { getPackagePath, getSiblingPackages, holdsPackage, isTestCode, toModulePath } from "#layout.ts"
import type { Settings } from "#settings.ts"
import { readLintedModule } from "#settings.ts"

/** A runtime import from a module in one package into a module in another, as paths relative to the root. */
interface RuntimeImport {
  importer: string
  imported: string
}

// Match the files a project's modules live in, declaration files included.
const MODULE_EXTENSION = /\.[cm]?[jt]sx?$/v

/** Returns every module file in a folder, at any depth, sorted so reports name the same import each run. */
const listModuleFiles = (directory: string): string[] => {
  if (!fs.existsSync(directory)) return []

  return fs
    .readdirSync(directory, { recursive: true, encoding: "utf8" })
    .filter((filePath) => MODULE_EXTENSION.test(filePath))
    .map((filePath) => path.join(directory, filePath))
    .toSorted()
}

/**
 * Returns the first runtime import from a module in `fromPackage` into `toPackage`, or `undefined` when there's none.
 * Skips test code, which may import anything.
 */
export const findRuntimeImportBetween = (
  settings: Settings,
  fromPackage: string,
  toPackage: string,
): RuntimeImport | undefined => {
  for (const filePath of listModuleFiles(path.join(settings.rootDirectory, fromPackage))) {
    const importer = toModulePath(settings.rootDirectory, filePath)
    if (importer === undefined || isTestCode(importer, settings.testsFolder)) continue

    for (const importPath of readRuntimeImports(filePath)) {
      const imported = toModulePath(settings.rootDirectory, importPath)
      if (imported !== undefined && holdsPackage(toPackage, getPackagePath(imported))) return { importer, imported }
    }
  }
  return undefined
}

export const noMutualImports = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Forbid two sibling packages from importing each other at runtime." },
    messages: {
      mutualImport:
        "'{{module}}' is in package '{{otherPackage}}', which imports '{{ownPackage}}' at runtime: '{{backImporter}}' imports '{{backImported}}'. Pass the value in instead of importing it, move the module to the package it belongs to, or move what both need into a package beside them.",
    },
  },
  create: (context) => {
    const lintedModule = readLintedModule(context)
    // Skip test code, because nothing imports a test, so it can't tie two packages together.
    if (lintedModule === undefined || lintedModule.isTestCode) return {}

    const importerPackage = getPackagePath(lintedModule.modulePath)
    // Look up each package's imports back once per file, because a file often imports several modules from one package.
    const backImports = new Map<string, RuntimeImport | undefined>()

    return visitImports(context.filename, ({ node, importPath, isTypeOnly }) => {
      const importedModule = toModulePath(lintedModule.rootDirectory, importPath)
      if (isTypeOnly || importedModule === undefined) return

      const siblingPackages = getSiblingPackages(importerPackage, getPackagePath(importedModule))
      if (siblingPackages === undefined) return

      const [ownPackage, otherPackage] = siblingPackages
      if (!backImports.has(otherPackage))
        backImports.set(otherPackage, findRuntimeImportBetween(lintedModule, otherPackage, ownPackage))

      const backImport = backImports.get(otherPackage)
      if (backImport === undefined) return

      context.report({
        node,
        messageId: "mutualImport",
        data: {
          module: importedModule,
          ownPackage,
          otherPackage,
          backImporter: backImport.importer,
          backImported: backImport.imported,
        },
      })
    })
  },
})
