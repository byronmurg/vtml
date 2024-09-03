import type FilterContext from "../filter_context"
import type { Tag } from "../types"
import * as utils from "../utils"
import type {TagElement} from "../html"
import templateAttributes from "../attributes"
import Debug from "debug"
import DefaultError from "../default_errors"

import { filterPass } from "../tag_utils"
import doesLogicSelectorMatch from "../logic"

const baseDebug = Debug("vtml:check_tags")

function CreateCheckTag(name:string, code:number): Tag {
	const checkDebug = baseDebug.extend(name)

	function elementCheck(el:TagElement) {
		const source = utils.getSource(el)

		return (ctx:FilterContext) => {
			const attributes = templateAttributes(el.attributes, ctx)
			const subCtx = ctx.Select(source)
			const match = doesLogicSelectorMatch(subCtx.dataset, attributes)
			checkDebug(match, source, attributes)
			return match
		}
	}


	function contains(el:TagElement) {
		const check = elementCheck(el)
		const message = utils.getAttribute(el, "message") || DefaultError(code)

		return (ctx:FilterContext) => {
			const found = check(ctx)
			if (! found) {
				ctx = ctx.SetError(code, message)
			}
			return { ctx, found }
		}
	}

	return {
		name: name,
		render(el, cascade) {
			const check = elementCheck(el)
			const childs = cascade.childs(el.elements)
			const message = utils.getAttribute(el, "message") || DefaultError(code)

			return async (ctx) => {
				const doesMatch = check(ctx)

				if (doesMatch) {
					return await childs(ctx)
				} else {
					ctx = ctx.SetError(code, message)
					return filterPass(ctx)
				}
			}
		},

		loaderContains: contains,
		actionContains: contains
	}
}

export const VFound = CreateCheckTag("v-check-found", 404)
export const VAuthorized = CreateCheckTag("v-check-authorized", 401)
export const VAllowed = CreateCheckTag("v-check-allowed", 403)
