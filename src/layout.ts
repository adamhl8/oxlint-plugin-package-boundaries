import path from "node:path"

/**
 * Returns where a module sits: its path relative to the root package's folder, with `/` separators. Returns `undefined`
 * for a module outside the root, which no package holds.
 */
export const toModulePath = (rootDirectory: string, absolutePath: string): string | undefined => {
  const relativePath = path.relative(rootDirectory, absolutePath)
  const [firstSegment] = relativePath.split(path.sep)
  const isOutsideRoot = relativePath === "" || firstSegment === ".." || path.isAbsolute(relativePath)
  return isOutsideRoot ? undefined : relativePath.split(path.sep).join("/")
}

/** Returns the package a module is in, as a path relative to the root. The root package is `""`. */
export const getPackagePath = (modulePath: string): string => {
  const directory = path.posix.dirname(modulePath)
  return directory === "." ? "" : directory
}

/** Reports whether `packagePath` holds `otherPackagePath`, at any depth, or is it. */
export const holdsPackage = (packagePath: string, otherPackagePath: string): boolean =>
  packagePath === "" || otherPackagePath === packagePath || otherPackagePath.startsWith(`${packagePath}/`)

/** Returns the package directly inside `packagePath` that holds `otherPackagePath`, the branch that leads to it. */
export const getBranch = (packagePath: string, otherPackagePath: string): string => {
  const rest = packagePath === "" ? otherPackagePath : otherPackagePath.slice(packagePath.length + 1)
  const [folder = ""] = rest.split("/")
  return packagePath === "" ? folder : `${packagePath}/${folder}`
}

/**
 * Returns the two sibling packages an import crosses between: the one that holds the importer and the one that holds
 * the imported module, both directly inside the package that holds the two. Returns `undefined` when one package holds
 * the other, because then the import isn't between siblings.
 */
export const getSiblingPackages = (
  importerPackagePath: string,
  importedPackagePath: string,
): [importerSide: string, importedSide: string] | undefined => {
  if (holdsPackage(importerPackagePath, importedPackagePath) || holdsPackage(importedPackagePath, importerPackagePath))
    return undefined

  const importerFolders = importerPackagePath.split("/")
  const importedFolders = importedPackagePath.split("/")
  const sharedDepth = importerFolders.findIndex((folder, index) => folder !== importedFolders[index])
  const toSide = (folders: string[]) => folders.slice(0, sharedDepth + 1).join("/")
  return [toSide(importerFolders), toSide(importedFolders)]
}

/** Returns a module's file name. */
export const getFileName = (modulePath: string): string => path.posix.basename(modulePath)

/** Returns a module's name up to its first dot, which drops suffixes like `.base` along with the extension. */
export const getModuleStem = (modulePath: string): string => {
  const [stem = ""] = getFileName(modulePath).split(".")
  return stem
}

// Match a test file's name, like `parser.test.ts` or `button.spec.tsx`.
const TEST_FILE_PATTERN = /\.(?:test|spec)\.[cm]?[jt]sx?$/v

/** Reports whether a module is a test file, by its name. */
export const isTestFile = (modulePath: string): boolean => TEST_FILE_PATTERN.test(getFileName(modulePath))

/** Reports whether a module sits in a tests folder, at any depth. */
export const isInTestsFolder = (modulePath: string, testsFolder: string): boolean =>
  getPackagePath(modulePath).split("/").includes(testsFolder)

/** Reports whether a module is test code: a test file, or anything in a tests folder, like a helper or a fixture. */
export const isTestCode = (modulePath: string, testsFolder: string): boolean =>
  isTestFile(modulePath) || isInTestsFolder(modulePath, testsFolder)

/** Reports whether a module is an index file, which is an entry point. */
export const isIndexModule = (modulePath: string): boolean => getModuleStem(modulePath) === "index"

/** Returns the name of the folder a module is in, or `""` for a module in the root package. */
export const getFolderName = (modulePath: string): string => path.posix.basename(getPackagePath(modulePath))
