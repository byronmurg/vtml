import type { Tag } from "../types"
import type {TagElement} from "../html"
import * as utils from "../utils"
import {filterPass } from "../tag_utils"
import Debug from "debug"

const debug = Debug("vtml:tags:page")

const getSubpagePaths = (el:TagElement): string[] => {
	const pages = utils.findPages(el.elements)
	return pages.map((page) => utils.getAttribute(page, "path"))
}

export const XPage:Tag = {
	name: "v-page",
	render(el, cascade) {
		const path = utils.requireAttribute(el, "path")
		const childs = cascade.childs(el.elements)

		const subPaths = getSubpagePaths(el)

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
