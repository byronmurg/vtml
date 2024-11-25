import CreateLogicTag from "./logic"
import doesLogicSelectorMatch from "../logic"

export const VIf = CreateLogicTag({
	name: "v-if",
	attributes: {
		"source": { required:true, source:true },
		"eq": {},

		"lt": {},
		"lte": {},
		"gt": {},
		"gte": {},
	},

	prepareLogic(block) {
		const source = block.sourceAttr()
		return async (ctx) => {
			const value = ctx.getKey(source)
			const attributes = block.templateAttributes(ctx)
			return doesLogicSelectorMatch(value, attributes)
		}
	}
})
