import FilterContext from "../filter_context"
import type {Tag} from "../types"
import {filterPass, justReturnFilter, prefixIfNotAlready} from "../tag_utils"
import pathLib from "path"
import * as utils from "../utils"
import templateAttributes from "../attributes"

export const FormTag:Tag = {
	name: "form",
	render(el, cascade) {
		// If it's not a POST I don't care
		if (utils.getAttribute(el, "method").toLowerCase() !== "post") {
			return justReturnFilter(el, cascade)
		} else {
			const xName = utils.requireAttribute(el, 'x-name')
			const xAjax = utils.getBoolAttribute(el, 'x-ajax')
			const childs = cascade.childs(el.elements)

			return async (ctx:FilterContext) => {
				const path = ctx.getKey("$.path")
				const search = ctx.getKey("$.search")
				const searchStr = search ? `?${search}` : ""

				// Don't need extra slash if path is empty
				const fullPath = path.endsWith(xName) ? path : pathLib.posix.join(path, xName)
				const pathSuffix = `${fullPath}${searchStr}`

				const actionPath = prefixIfNotAlready(pathSuffix, "/action")
				const ajaxPath = prefixIfNotAlready(pathSuffix, "/ajax")

				ctx = ctx.SetVar('__form_action', actionPath)
					.SetVar('__form_ajax', ajaxPath)

				const outputAttributes = templateAttributes(el.attributes, ctx)

				if (xAjax) {
					delete outputAttributes.method
				} else {
					outputAttributes.action ||= actionPath
				}

				const children = await childs(ctx)

				const resp = {
					...el,
					attributes: outputAttributes,
					elements: children.elements,
				}
				
				return filterPass(ctx, resp)
			}
		}
	},
}
