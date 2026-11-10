import { feature } from "#app/app.ts"
import type { Feature } from "#app/app.ts"
import { part as ownPart } from "#app/feature/feature.ts"
import { helper } from "#app/helper.ts"
import { usesApp } from "#uses-app.ts"
import { shout } from "#utils.ts"

export const part: Feature[] = [String(feature), String(ownPart), String(helper), String(usesApp), shout("a")]
