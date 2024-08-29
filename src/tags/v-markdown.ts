import type { Tag, Branch } from "../types"
import { filterPass } from "../tag_utils"
import * as utils from "../utils"
import {parse as mdParse} from "marked"
import * as HTML from "../html"
import { readFileSync } from "fs"

export const XMarkdown: Tag = {
	name: "v-markdown",
	render(el) {
		const mdSrc = utils.requireAttribute(el, "src")
		const md = readFileSync(mdSrc, "utf8")
		const rawHTML = mdParse(HTML.escapeHtml(md)) as string
		const html = HTML.parse(rawHTML, el.filename)

		// @TODO startIndex?
		return async (ctx): Promise<Branch> => {
			return filterPass(ctx, ...html)
		}
	},
}
