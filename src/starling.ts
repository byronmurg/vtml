#!/usr/bin/env node
import Express from "express"
import BodyParser from "body-parser"
import CookieParser from "cookie-parser"
import Debug from "debug"
import SwaggerUiExpress from "swagger-ui-express"
import {ValidationError} from "ajv"

import StarlingDocument from "./document"
import FilterContext from "./filter_context"
import {RootDataset} from "./types"

const debug = Debug("starling")

const createRootDataset = (req:Express.Request, pageNotFound:boolean = false): RootDataset => ({
	query: req.query,
	params: req.params,
	path: req.path,
	method: req.method,
	headers: req.headers,
	cookies: req.cookies,
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
	const starlingDocument = StarlingDocument.LoadFromFile(filePath)
	exposeStarlingDocument(starlingDocument)
}

function exposeStarlingDocument(starlingDocument:StarlingDocument) {

	const app = Express()
	app.use(BodyParser.urlencoded({ extended:true }))
	app.use(CookieParser())

	//
	// Expose POST Forms
	//

	const postForms = starlingDocument.forms

	function setCookies(res:Express.Response, ctx:FilterContext) {
		const cookies = ctx.GetCookies()

		for (const k in cookies) {
			const v = cookies[k]
			res.cookie(k, v)
		}
	}

	for (const form of postForms) {

		app.post(`/action/${form.name}`, async (req, res) => {
			try {
				const rootDataset = createRootDataset(req)
				const formRes = await form.executeFormEncoded(rootDataset, req.body)

				if (formRes.found) {
					setCookies(res, formRes.ctx)
					// Return the client to x-return or the referer
					res.redirect(307, form.return || "back")
				} else {
					res.status(404).send("Not Found")
				}
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
				const formRes = await form.executeFormEncoded(rootDataset, req.body)
				if (formRes.found) {
					setCookies(res, formRes.ctx)
					// @NOTE okay sends an empty response
					res.send("")
				} else {
					res.status(404).send("Not Found")
				}
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

		app.post(`/api/${form.name}`, Express.json(), async (req, res) => {
			try {
				const rootDataset = createRootDataset(req)
				const formRes = await form.execute(rootDataset, req.body)
				if (formRes.found) {
					setCookies(res, formRes.ctx)
					// @NOTE okay sends an empty response
					res.json({})
				} else {
					res.status(404).json({ message: "Not Found" })
				}
			} catch (e) {
				if (e instanceof ValidationError) {
					const msg = formatValidationError(e)
					res.status(400).json({ message:msg })
				} else {
					console.error(e)
					res.status(500).json({ message: "Something went wrong" })
				}
			}
		})

		app.get(`/api/${form.name}`, (req, res) => {
			res.json({ inputSchema:form.inputSchema })
		})
	}

	// Expose api docs
	app.use("/api-docs", SwaggerUiExpress.serve, SwaggerUiExpress.setup(starlingDocument.oapiSchema))


	// @NOTE for debuging
	if (debug.enabled) {
		app.get("/debug", async (req, res) => {
			const ctx = createFilterContextFromRequest(req)
			const clientDocument = await starlingDocument.renderElements(ctx)
			res.json(clientDocument)
		})
	}


	const pages = starlingDocument.findPages()

	for (const path of pages) {
		debug("page found", path)

		app.all(path, async (req, res) => {
			const ctx = createFilterContextFromRequest(req)
			const html = await starlingDocument.renderLoader(ctx)
			res.send(html)
		})
	}

	// Exposes

	const exposes = starlingDocument.findExposes()

	for (const expose of exposes) {
		app.get(expose.path, (req, res) => {
			if (expose.contentType) {
				res.setHeader("Content-Type", expose.contentType)
			}
			res.sendFile(expose.src, {
				root: process.cwd(),
			})
		})
	}

	// This has to be an all as the redirects
	// preserve the POST method
	app.all("/*", async (req, res) => {
		const ctx = createFilterContextFromRequest(req, true)
		const html = await starlingDocument.renderLoader(ctx)
		res.send(html)
	})


	// Determine the listen port in order of
	// - env
	// - hint
	// - default (3000)
	const portStr = process.env.PORT || starlingDocument.findHint("x-hint-port", "port") || "3000"
	const port = parseInt(portStr)

	if (isNaN(port)) {
		throw Error(`Invalid port ${process.env.PORT}`)
	}

	app.listen(port, "localhost", () => console.log(`Started on port ${port}`))
}
run()
