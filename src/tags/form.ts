import FilterContext from "../filter_context"
import type {Tag} from "../types"
import {filterPass, justReturnFilter} from "../tag_utils"
import pathLib from "path"
import * as utils from "../utils"
import templateAttributes from "../attributes"

function extractRelevantPath(path:string, matchedPage:string = ''): string {
	const noRelevantParts = matchedPage.split('/').length
	return path.split('/').slice(1, noRelevantParts).join('/')
}

function getFullPath(xName:string, ctx:FilterContext): string {
	const path = ctx.getKey("$.path")
	const search = ctx.getKey("$.search")
	const matchedPage = ctx.getKey("$__matchedPage")
	const searchStr = search ? `?${search}` : ""

	const relevantPath = extractRelevantPath(path, matchedPage)

	// Don't need extra slash if path is empty
	const fullPath = pathLib.posix.join(relevantPath, xName)
	return `/${fullPath}${searchStr}`
}

export const FormTag:Tag = {
	name: "form",
	render(el, cascade) {
		const xName = utils.getAttribute(el, 'v-name')
		// If it's not an action I don't care
		if (!xName) {
			return justReturnFilter(el, cascade)
		} else {
			const xAjax = utils.getBoolAttribute(el, 'v-ajax')
			const childs = cascade.childs(el.elements)

			return async (ctx:FilterContext) => {
				const fullPath = getFullPath(xName, ctx)

				const actionPath = "/action" +fullPath
				const ajaxPath = "/ajax" +fullPath

				const subCtx = ctx.SetVar('__form_action', actionPath)
					.SetVar('__form_ajax', ajaxPath)

				const outputAttributes = templateAttributes(el.attributes, subCtx)

				if (xAjax) {
					outputAttributes.onsubmit ||= "return false"
				} else {
					outputAttributes.method = "POST"
					outputAttributes.action ||= actionPath
				}

				const children = await childs(subCtx)

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
