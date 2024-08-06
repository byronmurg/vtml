import type { Element } from "../html"
import type { Tag } from "../types"
import { filterPass } from "../tag_utils"

export const XDump: Tag = {
	name: "x-dump",
	render(el) {
		return async (ctx) => {
			const resp: Element = {
				type: "element",
				name: "pre",
				startIndex: el.startIndex,
				attributes: el.attributes,
				elements: [
					{
						type: "text",
						text: JSON.stringify(ctx.dataset, null, 2),
						startIndex: el.startIndex,
					},
				],
			}

			return filterPass(ctx, resp)
		}
	},
}
