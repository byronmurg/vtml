import type {VtmlTag} from "../types"

export const VForEach: VtmlTag = {
	name: "v-for-each",
	attributes: {
		source: { required:true, source:true },
		as: { required:true, inject:true },
	},
	prepare: (branch) => {

		const source = branch.sourceAttr()
		const asAttr = branch.attr("as")

		return {
			preceeds: (ctx) => Promise.resolve(ctx),
			// Always found!!!
			contains: (ctx) => Promise.resolve({ ctx, found:true }),

			async render(ctx) {
				
				const ctxs = ctx.SplitAs(source, asAttr)

				const childBranches = await Promise.all(ctxs.map((s) => branch.renderChildren(s)))
				const elements = childBranches.flatMap((child) => child.elements)
				return { ctx, elements }
			}
		}
	},
}


