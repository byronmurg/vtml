import CreateOverrideTag from "./override"
import * as utils from "../utils"

export const Select = CreateOverrideTag({
	name: "select",
	attributes: {},
	prepareRender: (block) => {
		const el = block.element()

		return async (ctx) => {
			const attrs = block.templateAttributes(ctx)
			const children = await block.renderChildren(ctx)
			//@TODO options don't have to be direct children
			for (const child of children.elements) {
				if (child.type === "element" && child.name === "option") {
					let value = child.attributes['value']
					// The value may be set as a child
					if (value === undefined) {
						value = utils.getText(child)
					}

					if (value === attrs['value']) {
						child.attributes['selected'] = "yes"
					}
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
