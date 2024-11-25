import CreateLoaderTag from "./loader"
import * as utils from "../utils"
import YAML from "yaml"

export 
const VYaml = CreateLoaderTag({
	name: "v-yaml",

	attributes: {
		"src": { special:true, relative:true, required:true },
		"target": { target:true, required:true },
	},
	bodyPolicy: "deny",

	prepareChain(block) {

		const yamlSrc = block.attr("src")
		const yaml = utils.readFile(yamlSrc)
		const targetAttr = block.targetAttr()
		const yamlData = YAML.parse(yaml)

		return async (ctx) => ctx.SetVar(targetAttr, yamlData)
	}
})
