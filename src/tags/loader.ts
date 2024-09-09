import type {TagCommon, VtmlTag } from "../types"
import type FilterContext from "../filter_context"
import type {VtmlBlock} from "../block"

type LoaderTag = TagCommon & {
	prepareChain: (block:VtmlBlock) => (ctx:FilterContext) => Promise<FilterContext>
}

export default
function CreateLoaderTag(tag:LoaderTag): VtmlTag {
	return {
		name: tag.name,
		attributes: tag.attributes,

		prepare(block) {
			const chain = tag.prepareChain(block)

			return {
				preceeds: chain,

				// Loaders never contain anything
				contains: (ctx) => Promise.resolve({ found:false, ctx }),

				render: async (ctx) => {
					const newCtx = await chain(ctx)
					return newCtx.filterPass()
				}
			}
		}
	}
}




