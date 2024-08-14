import type {Tag} from "../types"
import type {TextElement} from "../html"
import {filterHTML} from "../filter"
import * as utils from "../utils"
import {filterPass} from "../tag_utils"
import templateAttributes from "../attributes"

export const ScriptTag:Tag = {
	name: "script",
	render(el, cascade) {
		const text = utils.getText(el)

		if (text.trim()) {
			return async (ctx) => {
				const attributes = templateAttributes(el.attributes, ctx)

				const textBody = ctx.templateStringJson(text)

				const textNode: TextElement = {
					type: "text",
					text: textBody,
					startIndex: el.startIndex,
					filename: el.filename,
				}

				return filterPass(ctx, {
					...el,
					attributes,
					elements:[textNode],
					startIndex: el.startIndex,
				})
			}
		} else {
			return filterHTML(el, cascade)
		}
	},
}
