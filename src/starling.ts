#!/usr/bin/env node
import StarlingDocument from "./document"
import {exposeStarlingDocument, exposeOptions} from "./web"
import {program} from "commander"
import starterTemplate from "./template"

async function run(filePath:string, options:exposeOptions) {
	const starlingDocument = StarlingDocument.LoadFromFile(filePath)
	exposeStarlingDocument(starlingDocument, options)
}

program.name("starling")
	.description("Starling runtime cli")
	.version("0.1.0")
	.argument("<file>", "html start file")
	.option("--template", "Print the starter template")
	.option("--listen <addr>", "Listen address")
	.option("--port <port>", "Listen port")
	.action((file, options) => {
		if (options.template) {
			console.log(starterTemplate(file))
			return
		}

		const cliOptions:exposeOptions = {
			cliPort: options.port,
			cliListen: options.listen,
		}

		run(file, cliOptions)
	})

program.parse()
