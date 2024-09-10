import type {VtmlTag} from "../types"
import type FilterContext from "../filter_context"


export
const VWith: VtmlTag = {
	name: "v-with",
	attributes: {
		source: { source:true, required:true },	
		as: { inject:true, required:true },	
	},

	prepare(block) {
		const source = block.sourceAttr()
		const asAttr = block.attr("as")

		const isFound = (ctx:FilterContext) => ctx.getKey(source) !== undefined

		return {
			preceeds: (ctx) => Promise.resolve(ctx),

			contains: (ctx) => {
				const found = isFound(ctx)
				return Promise.resolve({ ctx, found })
			},

			async render(ctx) {
				const found = isFound(ctx)

				if (found) {
					const subCtx = ctx.Select(source, asAttr)
					return block.renderChildren(subCtx)
				} else {
					return ctx.filterPass()
				}
			}
		}
	}
}

