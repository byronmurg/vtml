import CreateDisplayTag from "./display"
import * as HTML from "../html"
import * as utils from "../utils"
import {parse as mdParse} from "marked"

export
const VMarkdown = CreateDisplayTag({
	name: "v-markdown",
	attributes: {
		"src": { special:true, required:true, relative:true },
	},

	prepareRender(block) {
		const mdSrc = block.attr("src")
		const md = utils.readFile(mdSrc)
		const rawHTML = mdParse(HTML.escapeHtml(md)) as string
		const html = HTML.parse(rawHTML, block.element().filename)

		return (ctx) => Promise.resolve({ ctx, elements:html })
	}
})
