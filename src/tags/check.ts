import type {VtmlTag} from "../types"
import type FilterContext from "../filter_context"
import doesLogicSelectorMatch from "../logic"
import CreateLogicTag from "./logic"
import DefaultError from "../default_errors"

type CheckTag = {
	name: string
	code: number
}

export default
function CreateCheckTag(tag:CheckTag): VtmlTag {
	return CreateLogicTag({
		name: tag.name,
		attributes: {
			"source": { required:true, source:true },
			"message": {},
			"eq": {},

			"lt": {},
			"lte": {},
			"gt": {},
			"gte": {},
		},

		prepareLogic(block) {
			const source = block.sourceAttr()
			const messageTmpl = block.attr("message")

			const check = (ctx:FilterContext) => {
				const attributes = block.templateAttributes(ctx)
				const value = ctx.getKey(source)
				return doesLogicSelectorMatch(value, attributes)
			}

			return async (ctx:FilterContext) => {
				const result = check(ctx)
				if (! result) {
					const message = ctx.templateStringSafe(messageTmpl) || DefaultError(tag.code)
					ctx.SetError(tag.code, message)
				}

				return result
			}
		},

	})
}

