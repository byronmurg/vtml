import CreateLoaderTag from "./loader"

export 
const VJson = CreateLoaderTag({
	name: "v-json",

	attributes: {
		"src": { special:true, relative:true },
		"target": { target:true, required:true },
	},
	bodyPolicy: "allowTextOnly",

	prepareChain(block) {
		const json = block.bodyOrSrc()

		if (block.attr("src") && block.hasChildren()) {
			throw Error(`cannot have a body when src is set`)
		}

		const targetAttr = block.targetAttr()
		const jsonData = JSON.parse(json)

		return async (ctx) => ctx.SetVar(targetAttr, jsonData)
	}
})
