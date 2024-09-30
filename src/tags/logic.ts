import type {TagCommon, VtmlTag} from "../types"
import type {VtmlBlock} from "../block"
import type FilterContext from "../filter_context"

type LogicTag = TagCommon & {
	prepareLogic: (block:VtmlBlock) => (ctx:FilterContext) => Promise<boolean>
}

export default
function CreateLogicTag(tag:LogicTag): VtmlTag {

	return {
		name: tag.name,
		attributes: tag.attributes,

		prepare(block) {
			const check = tag.prepareLogic(block)

			return {
				injectGlobals: () => [],
				preceeds: (ctx) => Promise.resolve(ctx),
				contains: async (ctx) => {
					const match = await check(ctx)
					return { found:match, ctx }
					
				},
				render: async (ctx) => {
					const match = await check(ctx)
					if (match) {
						return block.renderChildren(ctx)
					} else {
						return ctx.filterPass()
					}
				}
			}
		},

	}
}

