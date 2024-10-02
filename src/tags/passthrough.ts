import type { TagCommon, VtmlTag } from "../types"

type PassthroughTag = TagCommon & { hasBody?:true }

export default
function CreatePassthroughTag(tag:PassthroughTag): VtmlTag {
	return {
		name: tag.name,
		attributes: tag.attributes,
		neverHasBody: !tag.hasBody,

		prepare: (block) => ({
			injectGlobals: () => [],
			preceeds: (ctx) => Promise.resolve(ctx),
			contains: (ctx) => Promise.resolve({ found:true, ctx }),
			render: (ctx) => block.renderChildren(ctx),
		})
	}
}
