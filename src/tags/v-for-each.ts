import type { Tag, Branch } from "../types"
import * as utils from "../utils"

export const XForEach: Tag = {
	name: "v-for-each",
	render(el, cascade) {
		const source = utils.getSource(el)
		const childs = cascade.childs(el.elements)

		const pages = utils.findPages(el.elements)
		if (pages.length) {
			utils.error(el, "v-page cannot appear inside v-for-each")
		}

		return async (ctx): Promise<Branch> => {
			const ctxs = ctx.Select(source).Split()

			const childBranches = await Promise.all(ctxs.map((s) => childs(s)))
			const elements = childBranches.flatMap((branch) => branch.elements)
			return { ctx, elements }
		}
	},
}
