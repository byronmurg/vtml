import FilterContext from "../filter_context"
import {joinPaths} from "../utils"
import CreateOverrideTag from "./override"

function extractRelevantPath(path: string, matchedPage: string = ""): string {
	const noRelevantParts = matchedPage.split("/").length
	return path.split("/").slice(1, noRelevantParts).join("/")
}

function getFullPath(xName: string, ctx: FilterContext): string {
	const path = ctx.rootDataset.path
	const search = ctx.rootDataset.search
	const matchedPage = ctx.getKey("$__matchedPage")
	const searchStr = search ? `?${search}` : ""

	const relevantPath = extractRelevantPath(path, matchedPage)

	// Don't need extra slash if path is empty
	const fullPath = joinPaths(relevantPath, xName)
	return `/${fullPath}${searchStr}`
}

export const Form = CreateOverrideTag({
	name: "form",
	attributes: {
		"v-ajax": { strip: true },
		"v-name": { special: true },
		method: { special: true },
	},
	prepareRender: (block) => {
		const xName = block.attr("v-name")
		const xAjax = block.boolAttr("v-ajax")
		const el = block.element()

		return async (ctx) => {
			if (!xName) {
				return block.defaultBehaviour(ctx)
			}

			const fullPath = getFullPath(xName, ctx)

			const outputAttributes = block.templateAttributes(ctx)
			delete outputAttributes["v-name"]

			if (xAjax) {
				outputAttributes['onsubmit'] ||= "return false"
			} else {
				// @TODO This is an assumption
				outputAttributes['method'] = "POST"
				outputAttributes['action'] ||= fullPath
			}

			const children = await block.renderChildren(ctx)

			const resp = {
				name: "form",
				type: el.type,
				filename: el.filename,
				attributes: outputAttributes,
				elements: children.elements,
			}

			return { ctx, elements: [resp] }
		}
	},
})
