import type { Tag, Branch } from "../types"
import * as utils from "../utils"

export const XForEach: Tag = {
	name: "x-for-each",
	render(el, cascade) {
		const source = utils.getSource(el)
		const childs = cascade.childs(el.elements)

		return async (ctx): Promise<Branch> => {
			const ctxs = ctx.Select(source).Split()

			const childBranches = await Promise.all(ctxs.map((s) => childs(s)))
			const elements = childBranches.flatMap((branch) => branch.elements)
			return { ctx, elements }
		}
	},
}
