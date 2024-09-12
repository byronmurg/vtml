import CreateDisplayTag from "./display"
import * as utils from "../utils"

export
const VPage = CreateDisplayTag({
	name: "v-page",
	attributes: {
		"path": { special:true, required:true },
	},

	prepareRender(block) {


		const path = block.attr("path")

		const subPages = block.FindChildren(utils.byName("v-page"))
		const subPaths: string[] = []

		// Check that all sub-pages start with this page's path.
		for (const subPage of subPages) {
			const subPath = subPage.attr("path")
			if (! subPath.startsWith(path)) {
				subPage.error(`path must start with parent path (${path})`)
			}

			// Then collect the paths
			subPaths.push(subPath)
		}

		return async (ctx) => {
			const matchPath = ctx.getKey("$.matchedPath")
			if ((matchPath == path) || subPaths.includes(matchPath)) {
				block.debug("Match on page", path)
				ctx = ctx.SetVar("$__matchedPage", path)
				return block.renderChildren(ctx)
			} else {
				return ctx.filterPass()
			}
		}


	}
})
