import type { Tag, Branch } from "../types"
import type { TagElement } from "../html"
import { filterPass } from "../tag_utils"
import * as utils from "../utils"
import templateAttributes from "../attributes"
import { filterHTML } from "../filter"

export const InputTag: Tag = {
	name: "input",
	render(el, cascade) {
		// @NOTE Checkboxes have a slightly odd behaviour. HTML ticks a box if the
		// checked tag exists but the dev needs a way to set it from a template.
		// @TODO write test case for this.
		if (utils.getAttribute(el, "type") === "checkbox") {
			return async (ctx): Promise<Branch> => {
				const checkedTmpl = utils.getAttribute(el, "checked")
				const v = checkedTmpl ? ctx.getKey(checkedTmpl) : ""
				const checked = !!v && v !== "off"

				const attrs = templateAttributes(el.attributes, ctx)
				if (!checked) {
					delete attrs["checked"]
				} else {
					attrs.checked = "on"
				}

				return filterPass(ctx, el)
			}
		} else {
			// Otherwise it's just a normal html element
			return filterHTML(el, cascade)
		}
	},
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
