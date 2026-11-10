import path from "node:path"

// Name the root package's main module `index`, because it's the published entry point, and nothing outside imports it.
const ROOT_MAIN_MODULE_NAME = "index"

// Match a module's extension, a declaration file's included, so a name compares without it.
const MODULE_EXTENSION = /(?:\.d)?\.[cm]?[jt]sx?$/v

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

/** Returns a module's name without its folder or its extension. */
const getModuleName = (modulePath: string): string => path.posix.basename(modulePath).replace(MODULE_EXTENSION, "")

/** Returns the name of a package's main module: the package's own name, or `index` for the root package. */
const getMainModuleName = (packagePath: string): string =>
  packagePath === "" ? ROOT_MAIN_MODULE_NAME : path.posix.basename(packagePath)

/** Reports whether a module is its package's main module, the package's public surface. */
export const isMainModule = (modulePath: string): boolean =>
  getModuleName(modulePath) === getMainModuleName(getPackagePath(modulePath))

/** Returns the path of a package's main module, with the extension of `likeModulePath`. */
export const getMainModulePath = (packagePath: string, likeModulePath: string): string => {
  const [extension = ""] = MODULE_EXTENSION.exec(likeModulePath) ?? []
  const fileName = `${getMainModuleName(packagePath)}${extension}`
  return packagePath === "" ? fileName : `${packagePath}/${fileName}`
}

/** Reports whether `packagePath` holds `otherPackagePath`, at any depth, or is it. */
export const holdsPackage = (packagePath: string, otherPackagePath: string): boolean =>
  packagePath === "" || otherPackagePath === packagePath || otherPackagePath.startsWith(`${packagePath}/`)

/**
 * Returns the package a module in `fromPackagePath` reaches `toPackagePath` through: the outermost package that holds
 * `toPackagePath` and sits beside `fromPackagePath` or beside a package that holds it. Returns `undefined` when
 * `toPackagePath` holds `fromPackagePath`, because a module reaches its own package and the ones that hold it
 * directly.
 */
export const getVisiblePackage = (fromPackagePath: string, toPackagePath: string): string | undefined => {
  if (holdsPackage(toPackagePath, fromPackagePath)) return undefined

  const folders = toPackagePath.split("/")
  const enclosingPackages = folders.map((_, index) => folders.slice(0, index + 1).join("/"))
  return enclosingPackages.find((packagePath) => !holdsPackage(packagePath, fromPackagePath))
}

/** Returns the package directly inside `packagePath` that holds `otherPackagePath`, the branch that leads to it. */
export const getBranch = (packagePath: string, otherPackagePath: string): string => {
  const rest = packagePath === "" ? otherPackagePath : otherPackagePath.slice(packagePath.length + 1)
  const [folder = ""] = rest.split("/")
  return packagePath === "" ? folder : `${packagePath}/${folder}`
}
