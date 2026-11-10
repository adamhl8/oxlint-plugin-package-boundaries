import type { ESTree } from "@oxlint/plugins"
import { defineRule } from "@oxlint/plugins"

import { resolveImport, toImportSource } from "#imports/imports.ts"
import { getMainModulePath, getPackagePath, getVisiblePackage, isMainModule, toModulePath } from "#layout/layout.ts"
import { getRootDirectory, OPTIONS_SCHEMA } from "#rule-options.ts"

/** An import that reaches into a package past its main module, with the package and the module to import instead. */
interface DeepImport {
  module: string
  package: string
  mainModule: string
}

type ImportStatement = ESTree.ImportDeclaration | ESTree.ExportNamedDeclaration | ESTree.ExportAllDeclaration

/**
 * Returns how an import reaches into another package past its main module, or `undefined` when it doesn't. A module
 * reaches another package only through the main module of the package it can see: one beside its own package, or beside
 * a package that holds it. Type-only imports count too, because a type is part of a package's public surface.
 */
export const findDeepImport = (
  rootDirectory: string,
  importerPath: string,
  importPath: string,
): DeepImport | undefined => {
  const importerModule = toModulePath(rootDirectory, importerPath)
  const importedModule = toModulePath(rootDirectory, importPath)
  if (importerModule === undefined || importedModule === undefined) return undefined

  const visiblePackage = getVisiblePackage(getPackagePath(importerModule), getPackagePath(importedModule))
  if (visiblePackage === undefined) return undefined

  const isVisibleMainModule = getPackagePath(importedModule) === visiblePackage && isMainModule(importedModule)
  if (isVisibleMainModule) return undefined

  return {
    module: importedModule,
    package: visiblePackage,
    mainModule: getMainModulePath(visiblePackage, importedModule),
  }
}

export const noDeepImports = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Require a package to be imported only through its main module." },
    schema: OPTIONS_SCHEMA,
    messages: {
      deepImport:
        "'{{module}}' is inside package '{{package}}'. Import it through that package's main module, '{{mainModule}}'.",
    },
  },
  create: (context) => {
    const rootDirectory = getRootDirectory(context)
    if (rootDirectory === undefined) return {}

    const checkImport = (node: ImportStatement) => {
      const importSource = toImportSource(node)
      if (importSource === undefined) return

      const importPath = resolveImport(context.filename, importSource.specifier)
      if (importPath === undefined) return

      const deepImport = findDeepImport(rootDirectory, context.filename, importPath)
      if (deepImport !== undefined) context.report({ node, messageId: "deepImport", data: { ...deepImport } })
    }

    return { ImportDeclaration: checkImport, ExportNamedDeclaration: checkImport, ExportAllDeclaration: checkImport }
  },
})
