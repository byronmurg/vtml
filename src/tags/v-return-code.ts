import type { Tag } from "../types"
import type {TagElement} from "../html"
import type FilterContext from "../filter_context"
import { filterPass, stripFilter } from "../tag_utils"
import * as utils from "../utils"
import Debug from "debug"

const debug = Debug("vtml:tags:v-return-code")

function preceed(el:TagElement) {
	const code = utils.requireNumAttribute(el, "code")
	return async (ctx:FilterContext) => {
		debug("Setting return code", code)
		return ctx.SetReturnCode(code)
	}
}

export const XReturnCode: Tag = {
	name: "v-return-code",

	loaderPreceeds: preceed,
	actionPreceeds: preceed,

	render(el) {
		const run = preceed(el)
		return (ctx) => {
			return run(ctx).then(filterPass)
		}
	},
}

export const XReturnCodeAction: Tag = {
	name: "v-return-code-action",
	render: stripFilter,

	actionPreceeds: preceed,

	action(el) {
		const run = preceed(el)
		return (ctx) => {
			return run(ctx).then(filterPass)
		}
	},
}
