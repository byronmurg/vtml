import type {TagCommon, Branch, VtmlTag} from "../types"
import type FilterContext from "../filter_context"
import type { VtmlBlock } from "../block"

type OverrideTag = TagCommon & {
	prepareRender: (block: VtmlBlock) => (ctx: FilterContext) => Promise<Branch>
}

export default function CreateOverrideTag(tag: OverrideTag): VtmlTag {
	return {
		name: tag.name,
		attributes: tag.attributes,
		allowExtraAttributes: true,

		// Although some tags may not have a body that's HTML's problem not ours.
		bodyPolicy: "allow",

		prepare(block) {
			const render = tag.prepareRender(block)

			return {
				injectGlobals: () => [],
				preceeds: (ctx) => Promise.resolve(ctx),
				// Always found!!!
				contains: (ctx) => Promise.resolve({ ctx, found: true }),

				render,
			}
		},
	}
}
