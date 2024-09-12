import CreateOverrideTag from "./override"
import type {TagElement} from "../html"
import * as utils from "../utils"

const isOption = (el:TagElement) => el.name === "option"

export const Select = CreateOverrideTag({
	name: "select",
	attributes: {},
	prepareRender: (block) => {
		const el = block.element()

		return async (ctx) => {
			const attrs = block.templateAttributes(ctx)
			const children = await block.renderChildren(ctx)

			for (const option of utils.findElementsInList(children.elements, isOption)) {
				let value = option.attributes['value']
				// The value may be set as a child
				if (value === undefined) {
					value = utils.getText(option)
				}

				if (value === attrs['value']) {
					option.attributes['selected'] = "yes"
				}
			}

			const resp = {
				name: "select",
				type: el.type,
				filename: el.filename,
				attributes: attrs,
				elements: children.elements,
			}

			return { ctx, elements:[resp] }
		}
	},
})
