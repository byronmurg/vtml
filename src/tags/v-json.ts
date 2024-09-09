import CreateLoaderTag from "./loader"

export 
const VJson = CreateLoaderTag({
	name: "v-json",

	attributes: {
		"src": { special:true, relative:true },
		"target": { target:true, required:true },
	},

	prepareChain(block) {
		const json = block.bodyOrSrc()
		const targetAttr = block.targetAttr()
		const jsonData = JSON.parse(json)

		return async (ctx) => ctx.SetVar(targetAttr, jsonData)
	}
})
