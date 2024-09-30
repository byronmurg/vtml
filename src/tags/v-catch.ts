import type {VtmlTag} from "../types"
import type FilterContext from "../filter_context"

export
const VCatch: VtmlTag = {
	name: "v-catch",

	attributes: {},

	consumesError: true,

	prepare(block) {
		return {
			preceeds: (ctx:FilterContext) => Promise.resolve(ctx.UnsetError()),
			contains: (ctx) => Promise.resolve({ctx, found:true}),
			injectGlobals: () => [],

			async render(ctx) {
				if (ctx.InError()) {
					block.debug("render")
					ctx = ctx.SetVar("$error", ctx.GetError()).UnsetError()
					return block.renderChildren(ctx)
				} else {
					block.debug("pass")
					return ctx.filterPass()
				}
			}
		}
	}
}
