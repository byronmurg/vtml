import CreateDisplayTag from "./display"
import * as HTML from "../html"
import {parse as mdParse} from "marked"

function mdToHtml(md:string, filename:string) {
	const rawHTML = mdParse(HTML.escapeHtml(md)) as string
	return HTML.parse(rawHTML, filename)
}

export
const VMarkdown = CreateDisplayTag({
	name: "v-markdown",
	attributes: {
		"src": { special:true, relative:true },
		"source": { source:true },
	},

	prepareRender(block) {
		const filename = block.element().filename
		const source = block.sourceAttr()

		if (source) {
			if (block.hasChildren()) {
				block.error(`cannot have a body when source is set`)
			}

			return async (ctx) => {
				const md = ctx.getKey(source)
				if (md) {
					const html = mdToHtml(md, filename)
					return { ctx, elements:html }
				} else {
					return ctx.filterPass()
				}
			}
		} else {
			const md = block.bodyOrSrc()
			const html = mdToHtml(md, filename)

			if (block.attr("src") && block.hasChildren()) {
				block.error(`cannot have a body when source is set`)
			}


			return (ctx) => Promise.resolve({ ctx, elements:html })
		}
	}
})
