import { readFileSync } from "node:fs"

import { part } from "#app/feature/part.ts"
import { lib } from "#lib/lib.ts"
import type { Lib } from "#lib/lib-types.ts"
import { lib as relativeLib } from "../lib/lib.ts"

export const usesLib: Lib[] = [part, lib, relativeLib].map(Number)
export const read = readFileSync
