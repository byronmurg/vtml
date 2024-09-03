import type { Tag } from "../types"
import type {TagElement} from "../html"
import type FilterContext from "../filter_context"
import { filterPass, stripFilter } from "../tag_utils"
import * as utils from "../utils"
import {ServerError} from "../default_errors"
import Debug from "debug"

const debug = Debug("vtml:tags:v-thow")

function preceed(el:TagElement) {
	const messageTmpl = utils.getAttribute(el, "message")
	return async (ctx:FilterContext) => {
		const message = messageTmpl ? ctx.templateStringSafe(messageTmpl) : ServerError
		debug("throwing error", message)
		throw Error(message)
	}
}

export const VThrowAction: Tag = {
	name: "v-throw-action",

	render: stripFilter,
	actionPreceeds: preceed,

	action(el) {
		const run = preceed(el)
		return (ctx) => {
			return run(ctx).then(filterPass)
		}
	},
}
