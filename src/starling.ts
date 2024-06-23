#!/usr/bin/env node
import Express from "express"
import type { Element } from "./html"
import * as HTML from "./html"
import {readFileSync} from "node:fs"
import * as OAPI from "openapi3-ts/oas31"
import BodyParser from "body-parser"
import Debug from "debug"
import SwaggerUiExpress from "swagger-ui-express"
import preLoad from "./pre_load"
import {ValidationError} from "ajv"

import FilterContext from "./filter_context"
import {RootDataset} from "./types"
import FilterRoot from "./filter"
import * as utils from "./utils"
import PrepareForm from "./form"

const debug = Debug("starling")

const createRootDataset = (req:Express.Request, pageNotFound:boolean = false): RootDataset => ({
	query: req.query,
	params: req.params,
	path: req.path,
	method: req.method,
	headers: req.headers,
	pageNotFound,
})

const createFilterContextFromRequest = (req:Express.Request, pageNotFound:boolean = false): FilterContext => FilterContext.Init(
	createRootDataset(req, pageNotFound),
)

function formatValidationError(e:ValidationError): string {
	return e.message +" : "+ e.errors[0].message
}

async function run() {
	const filePath = process.argv[2]
	const document = preLoad(filePath)

	const app = Express()
	app.use(BodyParser.urlencoded({ extended:true }))

	//
	// POST Forms
	//

	const apiPaths: OAPI.OpenAPIObject["paths"] = {}
	const apiSpec: OAPI.OpenAPIObject = {
		openapi: "3.1.0",
		info: {
			title: "Starling api",
			version: "1.0",
		},
		paths: apiPaths,
	}
	const postForms = utils.findPostForms(document)

	for (const formElement of postForms) {

		const form = PrepareForm(formElement)

		app.post(`/action/${form.name}`, async (req, res) => {
			try {
				const rootDataset = createRootDataset(req)
				await form.executeFormEncoded(rootDataset, req.body)
				// Return the client to x-return or the referer
				res.redirect(307, form.return || "back")
		 	} catch (e) {
				if (e instanceof ValidationError) {
					const msg = formatValidationError(e)
					res.status(400).send(msg)
				} else {
					console.error(e)
					res.status(500).send("Something went wrong")
				}
			}
		})

		app.post(`/ajax/${form.name}`, async (req, res) => {
			try {
				const rootDataset = createRootDataset(req)
				await form.executeFormEncoded(rootDataset, req.body)
				// @NOTE okay sends an empty response
				res.send("")
			} catch (e) {
				if (e instanceof ValidationError) {
					const msg = formatValidationError(e)
					res.status(400).send(msg)
				} else {
					console.error(e)
					res.status(500).send("Something went wrong")
				}
			}
		})

		apiPaths[`/${form.name}`] = {
			post: {
				operationId: form.name,
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: form.inputSchema,
						}
					}
				}
			}
		}

		app.get(`/api/${form.name}`, (req, res) => {
			res.json({ inputSchema:form.inputSchema })
		})
	}

	// Expose api docs
	app.use("/api-docs", SwaggerUiExpress.serve, SwaggerUiExpress.setup(apiSpec))


	//
	// Main filter
	//

	// Create root filter
	const renderDocument = FilterRoot(document)

	// @NOTE for debuging
	if (debug.enabled) {
		app.get("/debug", async (req, res) => {
			const ctx = createFilterContextFromRequest(req)
			const clientDocument = await renderDocument(ctx)
			res.json(clientDocument)
		})
	}


	const pages = utils.findPages(document)

	for (const page of pages) {
		const path = utils.requireAttribute(page, 'path')
		debug("page found", path)

		app.all(path, async (req, res) => {
			const ctx = createFilterContextFromRequest(req)
			const clientDocument = await renderDocument(ctx)
			const html = HTML.serialize(clientDocument)
			res.send(html)
		})
	}

	// This has to be an all as the redirects
	// preserve the POST method
	app.all("/*", async (req, res) => {
		const ctx = createFilterContextFromRequest(req, true)
		const clientDocument = await renderDocument(ctx)
		const html = HTML.serialize(clientDocument)
		res.send(html)
	})


	// Determine the listen port in order of
	// - env
	// - hint
	// - default (3000)
	const portStr = process.env.PORT || utils.findHint(document, "x-hint-port", "port") || "3000"
	const port = parseInt(portStr)

	if (isNaN(port)) {
		throw Error(`Invalid port ${process.env.PORT}`)
	}

	app.listen(port, "localhost", () => console.log(`Started on port ${port}`))
}
run()
