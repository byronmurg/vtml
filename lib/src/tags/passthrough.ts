import type { TagCommon, VtmlTag } from "../types"

type PassthroughTag = TagCommon & { bodyPolicy:VtmlTag["bodyPolicy"] }

export default
function CreatePassthroughTag(tag:PassthroughTag): VtmlTag {
	return {
		name: tag.name,
		attributes: tag.attributes,
		bodyPolicy: tag.bodyPolicy,

		prepare: (block) => ({
			injectGlobals: () => [],
			preceeds: (ctx) => Promise.resolve(ctx),
			contains: (ctx) => Promise.resolve({ found:true, ctx }),
			render: (ctx) => block.renderChildren(ctx),
		})
	}
}
