import type {VtmlTag} from "../types"
import type FilterContext from "../filter_context"

export
const VWith: VtmlTag = {
	name: "v-with",
	attributes: {
		source: { source:true, required:true },	
		as: { inject:true, required:true },	
	},
	bodyPolicy: "require",

	prepare(block) {
		const source = block.sourceAttr()
		const asAttr = block.attr("as")

		const isFound = (ctx:FilterContext) => {
			const v = ctx.getKey(source)
			return (v !== undefined) && (v !== null)
		}

		return {
			injectGlobals: () => [],
			preceeds: (ctx) => Promise.resolve(ctx),

			contains: (ctx) => {
				const found = isFound(ctx)
				const subCtx = ctx.Select(source, asAttr)
				return Promise.resolve({ ctx:subCtx, found })
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

