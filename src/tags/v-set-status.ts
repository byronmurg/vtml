import CreateLoaderTag from "./loader"
import {toNum} from "../utils"

export 
const VSetStatus = CreateLoaderTag({
	name: "v-set-status",

	attributes: {
		"code": {  required:true },
	},

	prepareChain(block) {
		return async (ctx) => {
			const attrs = block.templateAttributes(ctx)
			const code = toNum(attrs["code"], 200)
			return ctx.SetReturnCode(code)
		}
	}
})
