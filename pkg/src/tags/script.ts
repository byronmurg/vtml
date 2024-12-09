import CreateOverrideTag from "./override"
import * as utils from "../utils"
import type {TextElement} from "../html"

export const Script = CreateOverrideTag({
	name: "script",
	attributes: {},
	prepareRender: (block) => {
		const el = block.element()
		const body = utils.getText(el).trim()

		return async (ctx) => {
			const attributes = block.templateAttributes(ctx)

			const textBody = ctx.templateScript(body)

			const textNode: TextElement = {
				type: "text",
				text: textBody,
				filename: el.filename,
				linenumber: el.linenumber,
			}

			const resp = {
				...el,
				attributes,
				elements:[textNode],
			}

			return { ctx, elements:[resp] }
		}
	},
})
