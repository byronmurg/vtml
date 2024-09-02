import type { Tag } from "../types"
import * as utils from "../utils"
import {filterPass } from "../tag_utils"
import Debug from "debug"

const debug = Debug("vtml:tags:page")

export const XPage:Tag = {
	name: "v-page",
	render(el, cascade) {
		const path = utils.requireAttribute(el, "path")
		const childs = cascade.childs(el.elements)

		const subPages = utils.findPages(el.elements)
		const subPaths:string[] = []

		// Check that all sub-pages start with this page's path.
		for (const subPage of subPages) {
			const subPath = utils.requireAttribute(subPage, "path")

			if (! subPath.startsWith(path+"/")) {
				utils.error(subPage, `path must start with parent path`)
			}

			// Then collect the paths
			subPaths.push(subPath)
		}

		return async (ctx) => {
			const matchPath = ctx.getKey("$.matchedPath")
			if ((matchPath == path) || subPaths.includes(matchPath)) {
				debug("Match on page", path)
				ctx = ctx.SetVar("__matchedPage", path)
				return await childs(ctx)
			} else {
				return filterPass(ctx)
			}
		}
	}
}
