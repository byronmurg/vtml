import type { Tag, Branch } from "../types"
import type { TagElement, Element } from "../html"
import { filterPass } from "../tag_utils"
import * as utils from "../utils"
import templateAttributes from "../attributes"
import { filterHTML } from "../filter"

export const InputTag: Tag = {
	name: "input",
	render(el, cascade) {
		if (utils.getAttribute(el, "type") === "date") {
			//
			// If the type is a date then the value may have been
			// templated as a full-date. In which case we just need
			// to chop of the time.
			//

			const childs = cascade.childs(el.elements)
			return async (ctx) => {
				const children = await childs(ctx)
				const resp:Element = {
					...el,
					attributes: templateAttributes(el.attributes, ctx),
					elements: children.elements,
				}

				if (resp.attributes.value) {
					const v = resp.attributes.value.toString()
					resp.attributes.value = v.substr(0, 10)
				}

				return filterPass(children.ctx, resp)
			}

		} else {
			return filterHTML(el, cascade)
		}
	}
}

export const SelectTag: Tag = {
	name: "select",
	render(el, cascade) {
		const childs = cascade.childs(el.elements)

		return async (ctx): Promise<Branch> => {
			const attrs = templateAttributes(el.attributes, ctx)
			const children = await childs(ctx)
			//@TODO options don't have to be direct children
			for (const child of children.elements) {
				if (child.type === "element" && child.name === "option") {
					let value = utils.optAttribute(child, "value")
					// The value may be set as a child
					if (value === undefined) {
						value = utils.getText(child)
					}

					if (value === attrs.value) {
						child.attributes.selected = "yes"
					}
				}
			}

			const resp: TagElement = {
				...el,
				attributes: attrs,
				elements: children.elements,
			}

			return filterPass(ctx, resp)
		}
	},
}
