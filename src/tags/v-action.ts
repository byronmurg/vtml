import type {VtmlTag} from "../types"
import Debug from "debug"

const debug = Debug("vtml:action")

export
const VAction: VtmlTag = {
	name: "v-action",
	attributes: {},
	prepare: (branch) => {
		return {
			preceeds: (ctx) => Promise.resolve(ctx),
			contains: (ctx) => {
				// Technically shouldn't be found inside a
				// contains. But still...
				const found = ctx.rootDataset.action
				return Promise.resolve({ ctx, found })
			},

			async render(ctx) {
				if (ctx.rootDataset.action) {
					// @TODO should this be calling some
					// action version that renders in sequence?
					debug("In action")
					return branch.renderChildren(ctx)
				} else {
					return ctx.filterPass()
				}
			}
		}	
	},
}