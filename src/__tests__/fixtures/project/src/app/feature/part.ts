import { feature } from "#app/feature.ts"
import type { Feature } from "#app/feature.ts"
import { helper } from "#app/helper.ts"
import { usesApp } from "#uses-app.ts"
import { shout } from "#utils.ts"

export const part: Feature[] = [String(feature), String(helper), String(usesApp), shout("a")]
