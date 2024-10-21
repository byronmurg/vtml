import type { VtmlTag } from "../types"
import {getPathParameterGlobals} from "../isolates/page"
import * as utils from "../utils"

export
const VPage: VtmlTag = {
	name: "v-page",
	attributes: {
		"path": { special:true, required:true },
	},

	providesError: false,
	bodyPolicy: "require",

	prepare: (block) => {
		const path = block.attr("path")

		const subPages = block.FindChildren(utils.byName("v-page"))
		const subPaths: string[] = []

		// Get all sub-paths. These wil have been validated by the isolate.
		for (const subPage of subPages) {
			const subPath = subPage.attr("path")
			// Then collect the paths
			subPaths.push(subPath)
		}

		const pathGlobals = getPathParameterGlobals(path)

		return {
			injectGlobals: () => pathGlobals,

			preceeds: (ctx) => Promise.resolve(ctx),
			// Always found!!!
			contains: (ctx) => {
				ctx = ctx.SetVar("$__matchedPage", path)
				return Promise.resolve({ ctx, found: true })
			},

			async render(ctx) {
				const matchPath = ctx.rootDataset.matchedPath
				if ((matchPath == path) || subPaths.includes(matchPath)) {
					block.debug("Match on page", path)
					ctx = ctx.SetVar("$__matchedPage", path)
					return block.renderChildren(ctx)
				} else {
					return ctx.filterPass()
				}
			}
		}
	}
}
