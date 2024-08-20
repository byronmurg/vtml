import type { Tag } from "../types"
import { filterPass, stripFilter } from "../tag_utils"
import * as utils from "../utils"

export const XRedirectAction: Tag = {
	name: "x-redirect-action",
	render: stripFilter,
	action(el) {
		const path = utils.requireAttribute(el, "path")
		return async (ctx) => {
			ctx = ctx.SetRedirect(path)
			return filterPass(ctx)
		}
	},
}
