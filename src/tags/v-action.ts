import type {VtmlTag} from "../types"
import {findInputs} from "../form"
import * as utils from "../utils"
import Debug from "debug"

const debug = Debug("vtml:action")

export
const VAction: VtmlTag = {
	name: "v-action",
	attributes: {},
	prepare: (block) => {
		const form = block.findAncestor(utils.byName("form"))

		if (!form) {
			return block.error(`v-action found outside a <form>`)
		}

		return {
			injectGlobals: () => {
				const inputs = findInputs(form)
				const inputNames = inputs.map((input) => input.attr("name"))

				return inputNames.map((name) => `$.body.${name}`)
			},
			preceeds: (ctx) => Promise.resolve(ctx),
			contains: (ctx) => {
				// Technically shouldn't be found inside a
				// contains. But still...
				const found = ctx.rootDataset.action
				return Promise.resolve({ ctx, found })
			},

			async render(ctx) {
				if (ctx.rootDataset.action) {
					debug("In action")
					return block.renderChildrenInOrder(ctx)
				} else {
					return ctx.filterPass()
				}
			}
		}	
	},
}
