import {VtmlTag} from "../types"
import {ServerError} from "../default_errors"
import type FilterContext from "../filter_context"

export
const VTry:VtmlTag = {
	name: "v-try",
	attributes: {},

	prepare(block) {
		return {
			preceeds: (ctx:FilterContext) => Promise.resolve(ctx),
			contains: (ctx) => Promise.resolve({ctx, found:true}),

			async render(ctx) {
				
				try {
					block.debug("started")
					return block.renderChildren(ctx)
				} catch (e) {
					console.log(e)
					ctx = ctx.SetError(500, ServerError)
					return ctx.filterPass()
				} finally {
					block.debug("finished")
				}
			}
		}
	}
}
