import type {VtmlTag} from "../types"
import type FilterContext from "../filter_context"

export
const VCatch: VtmlTag = {
	name: "v-catch",

	attributes: {},

	prepare(block) {
		return {
			preceeds: (ctx:FilterContext) => Promise.resolve(ctx.UnsetError()),
			contains: (ctx) => Promise.resolve({ctx, found:true}),

			async render(ctx) {
				if (ctx.InError()) {
					block.debug("render")
					return block.renderChildren(ctx)
				} else {
					block.debug("pass")
					return ctx.filterPass()
				}
			}
		}
	}
}
