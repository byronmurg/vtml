import FilterContext from "../filter_context"
import type { Tag, Branch } from "../types"
import type { TagElement } from "../html"
import { filterPass, stripFilter } from "../tag_utils"
import * as utils from "../utils"
import NodeFunction from "../node"

function elementNodeFunction(el: TagElement) {
	const body = utils.requireOneTextChild(el)
	const idAttr = utils.getAttribute(el, "id")

	return NodeFunction(body, idAttr)
}

export const XNodejs: Tag = {
	name: "x-nodejs",
	render(el) {
		const targetAttr = utils.requireTargetAttribute(el)
		const nodeBody = elementNodeFunction(el)

		return async (ctx): Promise<Branch> => {
			const resp = await nodeBody(ctx)

			// Set output to target
			const newCtx = ctx.SetVar(targetAttr, resp)

			// Pass with new ctx
			return filterPass(newCtx)
		}
	},

	actionPreceeds(el) {
		const targetAttr = utils.requireTargetAttribute(el)
		const nodeBody = elementNodeFunction(el)

		return async (ctx) => {
			const resp = await nodeBody(ctx)

			// Set output to target
			return ctx.SetVar(targetAttr, resp)
		}
	},
}

export const XNodejsAction: Tag = {
	name: "x-nodejs-action",
	render: stripFilter,
	action: (el) => {
		const target = utils.getAttribute(el, "target")
		const nodeBody = elementNodeFunction(el)

		return async (ctx: FilterContext) => {
			const output = await nodeBody(ctx)

			ctx = target ? ctx.SetVar(target, output) : ctx

			return filterPass(ctx)
		}
	},
}
