import type { Tag } from "../types"
import { filterPass, stripFilter } from "../tag_utils"
import * as utils from "../utils"

export const XRedirectAction: Tag = {
	name: "v-redirect-action",
	render: stripFilter,
	action(el) {
		const path = utils.requireAttribute(el, "path")
		return async (ctx) => {
			const realPath = ctx.templateStringSafe(path)
			ctx = ctx.SetRedirect(realPath)
			return filterPass(ctx)
		}
	},
}
