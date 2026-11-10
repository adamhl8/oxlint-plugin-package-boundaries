import type { ESTree } from "@oxlint/plugins"
import { defineRule } from "@oxlint/plugins"

import { getRuntimeReach, resolveImport, toImportSource } from "#imports/imports.ts"
import { getBranch, getPackagePath, holdsPackage, isMainModule, toModulePath } from "#layout/layout.ts"
import { getRootDirectory, OPTIONS_SCHEMA } from "#rule-options.ts"

/**
 * A runtime import of code that uses the importer's own package: the package's main module, or a module in a package
 * that holds it and reaches back into the branch that leads to the importer.
 */
type UpwardImport =
  | { kind: "ownMainModule"; module: string }
  | { kind: "usesOwnPackage"; module: string; branch: string }

type ImportStatement = ESTree.ImportDeclaration | ESTree.ExportNamedDeclaration | ESTree.ExportAllDeclaration

/**
 * Returns how a runtime import reaches up into code that uses the importer's own package, or `undefined` when it
 * doesn't. Code a package holds as shared code is fine, as long as it doesn't use the branch the importer is in.
 */
export const findUpwardImport = (
  rootDirectory: string,
  importerPath: string,
  importPath: string,
): UpwardImport | undefined => {
  const importerModule = toModulePath(rootDirectory, importerPath)
  const importedModule = toModulePath(rootDirectory, importPath)
  if (importerModule === undefined || importedModule === undefined || importerModule === importedModule)
    return undefined

  const importerPackage = getPackagePath(importerModule)
  const importedPackage = getPackagePath(importedModule)

  // Allow a sibling, but not the package's main module, because the main module uses the package.
  if (importedPackage === importerPackage)
    return isMainModule(importedModule) ? { kind: "ownMainModule", module: importedModule } : undefined
  if (!holdsPackage(importedPackage, importerPackage)) return undefined

  // Allow shared code in a package that holds this one, unless it reaches the branch this module is in.
  const branch = getBranch(importedPackage, importerPackage)
  const usesBranch = [...getRuntimeReach(importPath)].some((reachedPath) => {
    const reachedModule = toModulePath(rootDirectory, reachedPath)
    return reachedModule !== undefined && holdsPackage(branch, getPackagePath(reachedModule))
  })
  return usesBranch ? { kind: "usesOwnPackage", module: importedModule, branch } : undefined
}

export const noUpwardImports = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Forbid a runtime import of code that uses the importer's own package." },
    schema: OPTIONS_SCHEMA,
    messages: {
      ownMainModule:
        "'{{module}}' is the main module of this module's own package, and it uses this package. Import from the module that declares what you need, or import only types.",
      usesOwnPackage:
        "'{{module}}' uses package '{{branch}}', which holds this module. Import only types from it, or move what this module needs into shared code that doesn't use '{{branch}}'.",
    },
  },
  create: (context) => {
    const rootDirectory = getRootDirectory(context)
    if (rootDirectory === undefined) return {}

    const checkImport = (node: ImportStatement) => {
      const importSource = toImportSource(node)
      if (importSource === undefined || importSource.isTypeOnly) return

      const importPath = resolveImport(context.filename, importSource.specifier)
      if (importPath === undefined) return

      const upwardImport = findUpwardImport(rootDirectory, context.filename, importPath)
      if (upwardImport === undefined) return

      const { kind, ...data } = upwardImport
      context.report({ node, messageId: kind, data })
    }

    return { ImportDeclaration: checkImport, ExportNamedDeclaration: checkImport, ExportAllDeclaration: checkImport }
  },
})
