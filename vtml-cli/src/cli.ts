#!/usr/bin/env node
import {VtmlDocument, exposeOptions, serveVtmlDocument} from "@vtml/lib"
import {printRenderDescription} from "./description"
import printValidationErrors from "./validation_errors"
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
	.option("--validate", "Validate the document then exit")
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


		const initResult = VtmlDocument.LoadFromFile(file)

		if (! initResult.ok) {
			printValidationErrors(initResult.errors)
			return process.exit(1)
		}

		if (options.validate) {
			// As the results would already have been printed, just exit sucess.
			return process.exit(0)
		}

		const vtmlDocument = initResult.result

		if (options.describe) {
			const description = vtmlDocument.getRenderDescription()
			printRenderDescription(description)
			return;
		}

		const cliOptions:exposeOptions = {
			cliPort: options.port,
			cliListen: options.listen,
		}

		serveVtmlDocument(vtmlDocument, cliOptions)
	})

program.parse()
