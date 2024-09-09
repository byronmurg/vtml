import type { TagCommon, VtmlTag, Branch } from "../types"
import type {VtmlBlock} from "../block"
import type FilterContext from "../filter_context"

type DisplayTag = TagCommon & {
	prepareRender: (block: VtmlBlock) => (ctx: FilterContext) => Promise<Branch>
}

export default
function CreateDisplayTag(tag:DisplayTag): VtmlTag {

	return {
		name: tag.name,
		attributes: tag.attributes,

		prepare(block) {
			const render = tag.prepareRender(block)

			return {
				preceeds: (ctx) => Promise.resolve(ctx),
				// Always found!!!
				contains: (ctx) => Promise.resolve({ ctx, found: true }),

				render,
			}
		},

	}
}

