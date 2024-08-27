import Express from "express"
import BodyParser from "body-parser"
import CookieParser from "cookie-parser"
import Debug from "debug"
import SwaggerUiExpress from "swagger-ui-express"
import DefaultError from "./default_errors"

import StarlingDocument from "./document"
import FilterContext from "./filter_context"
import {RootDataset, RenderResponse, ResponseError, CookieMap} from "./types"
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

export type exposeOptions = {
	cliListen?: string
	cliPort?: number
}

function setCookies(res:Express.Response, cookies:CookieMap) {

	for (const k in cookies) {
		const v = cookies[k]
		const maxAge = v.maxAge || undefined
		res.cookie(k, v.value, {maxAge})
	}
}

function sendCatchError(res:Express.Response) {
	// What to send when an error is throw inside
	// error context.
	return (e:unknown) => {
		console.error(e)
		res.status(500).send(DefaultError(500))
	}
}


export
function exposeStarlingDocument(starlingDocument:StarlingDocument, options:exposeOptions) {

	const app = Express()
	app.use(BodyParser.urlencoded({ extended:true }))
	app.use(CookieParser())

	//
	// Basic responses
	//

	function filterResponseError(req:Express.Request, res:Express.Response, response:RenderResponse) {
		const err: ResponseError = {
			code: response.status,
			message: response.error || DefaultError(response.status),
		}
		const rootDataset = createRootDataset(req)

		const errRoot = { ...rootDataset, error:err }
		const ctx = FilterContext.Init(errRoot)
		
		return starlingDocument.renderLoader(ctx)
			.then((html) => res.send(html))
			.catch(sendCatchError(res))
	}

	function renderLoader(pageNotFound: boolean = false) {
		return async function(req:Express.Request, res:Express.Response) {
			debug("render loader")

			const ctx = createFilterContextFromRequest(req, pageNotFound)
			const response = await starlingDocument.renderLoaderHTML(ctx)

			debug("response", response.status)
			if (response.redirect) {
				debug("response redirect", response.redirect)
				res.redirect(307, response.redirect)
			} else if (response.status < 400) {
				debug("response ok")
				res.status(response.status).send("<!DOCTYPE html>"+response.html)
			} else {
				debug("response error")
				await filterResponseError(req, res, response)
			}
		}
	}

	//
	// Expose POST Forms
	//

	const postForms = starlingDocument.forms

	for (const form of postForms) {

		debug(`Create action /action${form.path}`)
		app.post(`/action${form.path}`, async (req, res) => {
			const rootDataset = createRootDataset(req)

			const formRes = await form.executeFormEncoded(rootDataset, req.body)

			if (formRes.status < 400) {
				setCookies(res, formRes.cookies)
				res.redirect(307, formRes.redirect  || "back")
			} else {
				await filterResponseError(req, res, formRes)
			}
		})

		app.post(`/ajax${form.path}`, async (req, res) => {

			const rootDataset = createRootDataset(req)

			const formRes = await form.executeFormEncoded(rootDataset, req.body)

			if (formRes.status < 400) {
				setCookies(res, formRes.cookies)
				const html = HTML.serialize(formRes.elements)
				res.status(formRes.status).send(html)
			} else {
				await filterResponseError(req, res, formRes)
			}
		})

		app.post(`/api${form.path}`, Express.json(), async (req, res) => {
			const rootDataset = createRootDataset(req)

			const formRes = await form.execute(rootDataset, req.body)

			if (formRes.status < 400) {
				setCookies(res, formRes.cookies)
				res.status(formRes.status).json({})
			} else {
				res.status(formRes.status).json({
					message: formRes.error
				})
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
			const response = await starlingDocument.renderDocument(ctx)
			res.json(response)
		})

		app.get("/root", async (req, res) => {
			res.json(starlingDocument.root)
		})
	}


	const pages = starlingDocument.findPages()

	for (const path of pages) {
		debug("page found", path)
		app.all(path, renderLoader(false))
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
	app.all("/", renderLoader(true))


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
