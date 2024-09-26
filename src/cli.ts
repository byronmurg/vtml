import VtmlDocument from "./document"
import {exposeVtmlDocument} from "./web"
import type {exposeOptions} from "./web"
import {printRenderDescription} from "./description"
import {program} from "commander"
import DevMode from "./dev_mode"
import starterTemplate from "./template"
import meta from "../package.json"

program.name("vtml")
	.description("Vtml runtime cli")
	.version(meta.version)
	.argument("<file>", "html start file")
	.option("--template", "Print the starter template")
	.option("--dev", "Watch files for changes and restart")
	.option("--describe", "Describe rendering")
	.option("--listen <addr>", "Listen address")
	.option("--port <port>", "Listen port")
	.action((file, options) => {

		if (options.template) {
			console.log(starterTemplate(file))
			return
		}

		if (options.dev) {
			return DevMode(file)
		}


		const vtmlDocument = VtmlDocument.LoadFromFile(file)

		if (options.describe) {
			const description = vtmlDocument.getRenderDescription()
			printRenderDescription(description)
			return;
		}

		const cliOptions:exposeOptions = {
			cliPort: options.port,
			cliListen: options.listen,
		}

		exposeVtmlDocument(vtmlDocument, cliOptions)
	})

program.parse()
