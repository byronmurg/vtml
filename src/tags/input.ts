import CreateOverrideTag from "./override"
import type {TagElement} from "../html"

export const InputTag = CreateOverrideTag({
	name: "input",
	attributes: {
		name: { required:true, special:true },

		type:      { special:true },
		maxlength: { special:true },
		minlength: { special:true },
		pattern: { special:true },
		required: { special:true },
	},
	prepareRender: (block) => {
		const type = block.attr("type")

		if (type === "date") {
			return async (ctx) => {
				//
				// If the type is a date then the value may have been
				// templated as a full-date. In which case we just need
				// to chop of the time.
				//

				const children = await block.renderChildren(ctx)
				const resp:TagElement = {
					...block.element(),
					attributes: block.templateAttributes(ctx),
					elements: children.elements,
				}

				const value = resp.attributes['value']
				if (value) {
					const v = value.toString()
					resp.attributes['value'] = v.substr(0, 10)
				}

				return { ctx, elements:[resp] }
			}

		} else {
			return block.defaultBehaviour
		}

	},
})
