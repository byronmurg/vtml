import Express from "express"
import BodyParser from "body-parser"
import CookieParser from "cookie-parser"
import Debug from "debug"
import SwaggerUiExpress from "swagger-ui-express"
import {ValidationError} from "ajv"

import StarlingDocument from "./document"
import FilterContext from "./filter_context"
import {RootDataset} from "./types"
import * as HTML from "./html"

const debug = Debug("starling")

const matchSearch = (url:string) => (url.match(/\?(.+)/)||[])[1]

const createRootDataset = (req:Express.Request, pageNotFound:boolean = false): RootDataset => ({
	query: req.query,
	params: req.params,
	search: matchSearch(req.originalUrl),
	matchedPath: req.route.path,
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

export type exposeOptions = {
	cliListen?: string
	cliPort?: number
}

type ResponseError = {
	code: number
	msg: string
}

function createResponseError(e:Error): ResponseError {
	if (e instanceof ValidationError) {
		const msg = formatValidationError(e)
		return { code:400, msg }
	} else {
		console.error(e)
		return { code:400, msg:"Something went wrong" }
	}
}

function sendError(res:Express.Response){
	return (err:Error) => {
		const e = createResponseError(err)
		res.status(e.code).send(e.msg)
	}
}

export
function exposeStarlingDocument(starlingDocument:StarlingDocument, options:exposeOptions) {

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
			const maxAge = v.maxAge || undefined
			res.cookie(k, v.value, {maxAge})
		}
	}

	for (const form of postForms) {

		debug(`Create action /action${form.path}`)
		app.post(`/action${form.path}`, async (req, res) => {
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

		app.post(`/ajax${form.path}`, async (req, res) => {
			try {
				const rootDataset = createRootDataset(req)
				const formRes = await form.executeFormEncoded(rootDataset, req.body)
				if (formRes.found) {
					setCookies(res, formRes.ctx)
					const html = HTML.serialize(formRes.elements)
					res.send(html)
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

		app.post(`/api${form.path}`, Express.json(), async (req, res) => {
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
	app.use("/api/_schema.json", (_, res) => res.json(starlingDocument.oapiSchema))


	// @NOTE for debuging
	if (debug.enabled) {
		app.get("/debug", async (req, res) => {
			const ctx = createFilterContextFromRequest(req)
			const clientDocument = await starlingDocument.renderElements(ctx)
			res.json(clientDocument)
		})

		app.get("/root", async (req, res) => {
			res.json(starlingDocument.root)
		})
	}


	const pages = starlingDocument.findPages()

	for (const path of pages) {
		debug("page found", path)

		app.all(path, (req, res) => {
			const ctx = createFilterContextFromRequest(req)
			starlingDocument.renderLoader(ctx)
				.then((html) => res.send(html))
				.catch(sendError(res))
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

	// A fallback for favicon to avoid the whole page rendering
	app.get("/favicon.ico", (_, res) => res.status(404).send("Not found"))

	// This has to be an all as the redirects
	// preserve the POST method
	//app.all("/*", async (req, res) => {
	//	const ctx = createFilterContextFromRequest(req, true)
	//	const html = await starlingDocument.renderLoader(ctx)
	//	res.send(html)
	//})

	// This has to be an all as the redirects
	// preserve the POST method
	app.all("/", (req, res) => {
		const ctx = createFilterContextFromRequest(req, true)
		starlingDocument.renderLoader(ctx)
			.then((html) => res.send(html))
			.catch(sendError(res))
	})


	// Determine the listen port in order of
	// - cli arg
	// - env
	// - hint
	// - default (3000)
	const portStr = options.cliPort?.toString() || process.env.PORT || starlingDocument.findHint("x-hint-port", "port") || "3000"
	const port = parseInt(portStr)

	if (isNaN(port)) {
		throw Error(`Invalid port ${process.env.PORT}`)
	}

	const listenAddr = options.cliListen || "localhost"

	app.listen(port, listenAddr, () => console.log(`Started on ${listenAddr}:${port}`))
}
