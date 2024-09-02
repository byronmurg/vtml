import type FilterContext from "../filter_context"
import type { Tag } from "../types"
import type { TagElement } from "../html"
import { filterPass, stripFilter, loaderOnlyPreceeds, loaderOnlyFilter } from "../tag_utils"
import * as utils from "../utils"
import {ServerError} from "../default_errors"
import NodeFunction from "../node"

function elementNodeFunction(el: TagElement) {
	const body = utils.requireOneTextChild(el)
	const idAttr = utils.getAttribute(el, "id")

	return NodeFunction(body, idAttr)
}

function runNode(el:TagElement) {
	const target = utils.getAttribute(el, "target")
	const nodeBody = elementNodeFunction(el)

	return async (ctx:FilterContext) => {
		try {
			const resp = await nodeBody(ctx)

			// Set output to target
			return target ? ctx.SetVar(target, resp) : ctx
		} catch (e) {
			const message = (e instanceof Error)? e.message : ServerError
			return ctx.ThrowError({ code:500, message })
		}
	}
}

function passNode(el:TagElement) {
	const run = runNode(el)
	return (ctx:FilterContext) => run(ctx).then(filterPass)
}

export const XNodejs: Tag = {
	name: "v-nodejs",
	render: loaderOnlyFilter(passNode),
	loaderPreceeds: runNode,
	actionPreceeds: loaderOnlyPreceeds(runNode),
}

export const XNodejsAction: Tag = {
	name: "v-nodejs-action",
	render: stripFilter,
	action: passNode,
}
