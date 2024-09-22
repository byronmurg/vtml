import CreateDisplayTag from "./display"
import type {Element} from "../html"

export
const VDump = CreateDisplayTag({
	name: "v-dump",
	attributes: {
		"source": { source:true, required:true },
	},

	prepareRender(block) {
		const source = block.sourceAttr()
		const el = block.element()

		return async (ctx) => {
			const data = ctx.getKey(source)
			const attrs = block.templateAttributes(ctx)

			const resp: Element = {
				type: "element",
				name: "pre",
				filename: el.filename,
				linenumber: el.linenumber,
				attributes: attrs,
				elements: [
					{
						type: "text",
						text: JSON.stringify(data, null, 2),
						filename: el.filename,
						linenumber: el.linenumber,
					},
				],
			}

			return { ctx, elements:[resp] }
		}
	}
})
