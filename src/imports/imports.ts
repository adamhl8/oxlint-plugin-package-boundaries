import fs from "node:fs"
import path from "node:path"

import { parseSync } from "oxc-parser"

import { findPackageJson, loadImportsMap, subpathToAbs } from "#imports/imports-map.ts"

/**
 * The parts of a statement this plugin reads to find an import. It's structural, so both oxlint's AST and
 * `oxc-parser`'s fit it.
 */
export interface ImportNode {
  type: string
  source?: unknown
  importKind?: string
  exportKind?: string
  specifiers?: readonly { type: string; importKind?: string; exportKind?: string }[]
}

/** An import's specifier, and whether it imports only types, which TypeScript removes before the code runs. */
export interface ImportSource {
  specifier: string
  isTypeOnly: boolean
}

/** The modules one module imports at runtime, as they were when its file was last read. */
interface RuntimeImports {
  modifiedAt: number
  importPaths: string[]
}

// Read imports and re-exports, the statements that load another module when this one loads.
// Leave out a dynamic `import()`, because it loads later, so it can't take part in the order modules load in.
const IMPORT_STATEMENT_TYPES = new Set(["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration"])

// Keep each module's runtime imports between files and runs, keyed on its path, because many imports reach the same
// modules. Check the modification time, because the language server keeps running while files change.
const RUNTIME_IMPORTS_CACHE = new Map<string, RuntimeImports>()

/** Returns a node's string value, like an import's source, or `undefined` for anything else. */
const getStringValue = (node: unknown): string | undefined =>
  typeof node === "object" && node !== null && "value" in node && typeof node.value === "string"
    ? node.value
    : undefined

/**
 * Returns what a statement imports, or `undefined` for a statement that imports nothing, like a local `export`. Counts
 * an import whose names are all `type` as type-only, because TypeScript removes it unless `verbatimModuleSyntax` is
 * on.
 */
export const toImportSource = (node: ImportNode): ImportSource | undefined => {
  if (!IMPORT_STATEMENT_TYPES.has(node.type)) return undefined

  const specifier = getStringValue(node.source)
  if (specifier === undefined) return undefined

  const { importKind, exportKind, specifiers = [] } = node
  const specifierKinds = specifiers.map((importSpecifier) => importSpecifier.importKind ?? importSpecifier.exportKind)
  const hasOnlyTypeNames = specifierKinds.length > 0 && specifierKinds.every((kind) => kind === "type")
  const isTypeOnly = importKind === "type" || exportKind === "type" || hasOnlyTypeNames
  return { specifier, isTypeOnly }
}

/** Reports whether a specifier is relative, like `./foo.ts` or `..`. */
const isRelativeSpecifier = (specifier: string): boolean =>
  specifier === "." || specifier === ".." || specifier.startsWith("./") || specifier.startsWith("../")

/**
 * Returns the file a local specifier points to, from a relative path or a `#` subpath import. Returns `undefined` for a
 * package's specifier, or a subpath import that no `imports` entry matches.
 */
export const resolveImport = (importerPath: string, specifier: string): string | undefined => {
  if (isRelativeSpecifier(specifier)) return path.resolve(path.dirname(importerPath), specifier)
  if (!specifier.startsWith("#")) return undefined

  const importsMap = loadImportsMap(importerPath)
  return importsMap && subpathToAbs(specifier, importsMap)
}

/** Returns the folder of the nearest `package.json` above a file, or `undefined` outside any project. */
export const findPackageDirectory = (filePath: string): string | undefined => {
  const packageJsonPath = findPackageJson(path.dirname(filePath))
  return packageJsonPath && path.dirname(packageJsonPath)
}

/** Returns the modules a module imports at runtime, read from its file, or none when the file can't be read. */
const readRuntimeImports = (modulePath: string): string[] => {
  const stats = fs.statSync(modulePath, { throwIfNoEntry: false })
  if (!stats?.isFile()) return []

  const cached = RUNTIME_IMPORTS_CACHE.get(modulePath)
  if (cached?.modifiedAt === stats.mtimeMs) return cached.importPaths

  const { program } = parseSync(modulePath, fs.readFileSync(modulePath, "utf8"))
  const importPaths = program.body.flatMap((statement) => {
    const importSource = toImportSource(statement)
    if (importSource === undefined || importSource.isTypeOnly) return []

    const importPath = resolveImport(modulePath, importSource.specifier)
    return importPath === undefined ? [] : [importPath]
  })

  RUNTIME_IMPORTS_CACHE.set(modulePath, { modifiedAt: stats.mtimeMs, importPaths })
  return importPaths
}

/** Returns every module `modulePath` reaches through runtime imports, at any depth. */
export const getRuntimeReach = (modulePath: string): Set<string> => {
  const reached = new Set<string>()
  const pending = [modulePath]
  for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
    for (const importPath of readRuntimeImports(next)) {
      if (reached.has(importPath)) continue
      reached.add(importPath)
      pending.push(importPath)
    }
  }
  return reached
}
