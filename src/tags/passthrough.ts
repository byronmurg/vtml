import type { TagCommon, VtmlTag } from "../types"

type PassthroughTag = TagCommon

export default
function CreatePassthroughTag(tag:PassthroughTag): VtmlTag {
	return {
		name: tag.name,
		attributes: tag.attributes,

		prepare: (block) => ({
			preceeds: (ctx) => Promise.resolve(ctx),
			contains: (ctx) => Promise.resolve({ found:true, ctx }),
			render: (ctx) => block.renderChildren(ctx),
		})
	}
}
