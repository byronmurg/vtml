import type { Tag } from "../types"
import * as utils from "../utils"
import {filterPass } from "../tag_utils"
import Debug from "debug"

const debug = Debug("starling:tags:page")

export const XPage:Tag = {
	name: "x-page",
	render(el, cascade) {
		const path = utils.requireAttribute(el, "path")
		const childs = cascade.childs(el.elements)

		return async (ctx) => {
			
			const matchPath = ctx.getKey("$.matchedPath")
			if (matchPath.startsWith(path)) {
				debug("Match on page", path)
				ctx = ctx.SetVar("__matchedPage", path)
				return await childs(ctx)
			} else {
				return filterPass(ctx)
			}
		}
	}
}

export const XDefaultPage:Tag = {
	name: "x-default-page",
	render(el, cascade) {
		const childs = cascade.childs(el.elements)
		return async (ctx) => {
			if (ctx.getKey("$.pageNotFound")) {
				return await childs(ctx)
			} else {
				return filterPass(ctx)
			}
		}
	}
}


