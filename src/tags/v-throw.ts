import type { Tag } from "../types"
import type {TagElement} from "../html"
import type FilterContext from "../filter_context"
import { filterPass, stripFilter } from "../tag_utils"
import * as utils from "../utils"
import DefaultError from "../default_errors"
import Debug from "debug"

const debug = Debug("vtml:tags:v-thow")

function preceed(el:TagElement) {
	const code = utils.requireNumAttribute(el, "code")
	const messageTmpl = utils.getAttribute(el, "message")
	return async (ctx:FilterContext) => {
		const message = messageTmpl ? ctx.templateStringSafe(messageTmpl) : DefaultError(code)
		debug("throwing error", code, message)
		return ctx.ThrowError({code, message})
	}
}

export const VThrow: Tag = {
	name: "v-throw",

	loaderPreceeds: preceed,
	actionPreceeds: preceed,

	render(el) {
		const run = preceed(el)
		return (ctx) => {
			return run(ctx).then(filterPass)
		}
	},
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
