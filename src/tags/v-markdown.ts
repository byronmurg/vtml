import CreateDisplayTag from "./display"
import * as HTML from "../html"
import {parse as mdParse} from "marked"

export
const VMarkdown = CreateDisplayTag({
	name: "v-markdown",
	attributes: {
		"src": { special:true, relative:true },
	},

	prepareRender(block) {
		const md = block.bodyOrSrc()
		const filename = block.element().filename
		const rawHTML = mdParse(HTML.escapeHtml(md)) as string
		const html = HTML.parse(rawHTML, filename)

		return (ctx) => Promise.resolve({ ctx, elements:html })
	}
})
