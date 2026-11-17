import type { ESTree } from "@oxlint/plugins"
import { defineRule } from "@oxlint/plugins"

import { getRuntimeReach, resolveImport, toImportSource } from "#imports/imports.ts"
import { getBranch, getPackagePath, holdsPackage, toModulePath } from "#layout/layout.ts"
import { getRootDirectory, OPTIONS_SCHEMA } from "#rule-options.ts"

/**
 * A runtime import of a module in a package that holds the importer's own, where the module reaches back into the
 * branch that leads to the importer.
 */
interface UpwardImport {
  module: string
  branch: string
}

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
  if (importerModule === undefined || importedModule === undefined) return undefined

  const importerPackage = getPackagePath(importerModule)
  const importedPackage = getPackagePath(importedModule)

  // Allow any module in the importer's own package.
  // A cycle there is the only runtime hazard, and `import/no-cycle` reports it.
  if (importedPackage === importerPackage || !holdsPackage(importedPackage, importerPackage)) return undefined

  const branch = getBranch(importedPackage, importerPackage)
  const usesBranch = [...getRuntimeReach(importPath)].some((reachedPath) => {
    const reachedModule = toModulePath(rootDirectory, reachedPath)
    return reachedModule !== undefined && holdsPackage(branch, getPackagePath(reachedModule))
  })
  return usesBranch ? { module: importedModule, branch } : undefined
}

export const noUpwardImports = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Forbid a runtime import of code in a holding package that uses the importer's own package." },
    schema: OPTIONS_SCHEMA,
    messages: {
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
      if (upwardImport !== undefined) context.report({ node, messageId: "usesOwnPackage", data: { ...upwardImport } })
    }

    return { ImportDeclaration: checkImport, ExportNamedDeclaration: checkImport, ExportAllDeclaration: checkImport }
  },
})
