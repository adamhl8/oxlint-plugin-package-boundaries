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
