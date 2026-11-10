import { readFileSync } from "node:fs"

import { part as featurePart } from "#app/feature/feature.ts"
import { part } from "#app/feature/part.ts"
import { internal } from "#lib/internal.ts"
import { lib } from "#lib/lib.ts"
import type { Deep } from "#lib/nested/deep.ts"
import { nested } from "#lib/nested/nested.ts"
import { internal as relativeInternal } from "../lib/internal.ts"
import { lib as relativeLib } from "../lib/lib.ts"

export { nested as reexported } from "#lib/nested/nested.ts"
export const usesLib: Deep[] = [featurePart, part, internal, lib, nested, relativeInternal, relativeLib].map(Number)
export const read = readFileSync
