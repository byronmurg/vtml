import type { Tag } from "../types"
import {filterPass } from "../tag_utils"
import Debug from "debug"
import {ServerError} from "../default_errors"

const debug = Debug("vtml:tags:v-try")

export const XTry:Tag = {
	name: "v-try",
	render(el, cascade) {
		const childs = cascade.childs(el.elements)

		return async (ctx) => {
			try {
				debug("Started")
				return childs(ctx)
			} catch (e) {
				console.log(e)
				ctx = ctx.SetError(500, ServerError)
				return filterPass(ctx)
			} finally {
				debug("finished")
			}
		}
	}
}
