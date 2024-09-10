import Express from "express"
import BodyParser from "body-parser"
import CookieParser from "cookie-parser"
import Debug from "debug"
import SwaggerUiExpress from "swagger-ui-express"
import DefaultError from "./default_errors"

import VtmlDocument from "./document"
import FilterContext from "./filter_context"
import type {RootDataset, ResponseError, CookieMap} from "./types"
import * as HTML from "./html"

const debug = Debug("vtml")

const matchSearch = (url:string) => (url.match(/\?(.+)/)||[])[1]

const createRootDataset = (req:Express.Request, action:boolean): RootDataset => ({
	query: req.query,
	params: req.params,
	search: matchSearch(req.originalUrl),
	matchedPath: req.route.path,
	path: req.path,
	method: req.method,
	headers: req.headers,
	cookies: req.cookies,
	action,
})

const createFilterContextFromRequest = (req:Express.Request, action:boolean): FilterContext =>
	FilterContext.Init(createRootDataset(req, action))

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

export
function exposeVtmlDocument(vtmlDocument:VtmlDocument, options:exposeOptions) {

	const app = Express()
	app.use(BodyParser.urlencoded({ extended:true }))
	app.use(CookieParser())

	//
	// Basic responses
	//

	async function renderFromContext(ctx:FilterContext, res:Express.Response) {
		debug("render loader")

		const response = await vtmlDocument.renderDocument(ctx)

		debug("response", response.status)
		if (response.redirect) {
			debug("response redirect", response.redirect)
			res.redirect(307, response.redirect)
		} else {
			res.status(response.status)
			HTML.serializeHTML(response.elements, res)
		}
	}

	async function filterResponseError(req:Express.Request, res:Express.Response, status:number, error:string|undefined = undefined) {
		const err: ResponseError = {
			code: status,
			message: error || DefaultError(status),
		}
		const rootDataset = createRootDataset(req, false)

		const errRoot = { ...rootDataset, error:err }
		const ctx = FilterContext.Init(errRoot)
		
		const response = await vtmlDocument.renderDocument(ctx)

		debug("response", response.status)
		if (response.redirect) {
			debug("response redirect", response.redirect)
			res.redirect(307, response.redirect)
		} else {
			res.status(status)
			HTML.serializeHTML(response.elements, res)
		}
	}

	function renderLoader() {
		return async function(req:Express.Request, res:Express.Response) {
			const ctx = createFilterContextFromRequest(req, false)
			return renderFromContext(ctx, res)
		}
	}

	//
	// Expose POST Forms
	//

	const postForms = vtmlDocument.forms

	for (const form of postForms) {

		debug(`Create action /action${form.path}`)
		app.post(`/action${form.path}`, async (req, res) => {
			const rootDataset = createRootDataset(req, true)

			const formRes = await form.executeFormEncoded(rootDataset, req.body)

			if (formRes.status < 400) {
				setCookies(res, formRes.cookies)
				res.redirect(307, formRes.redirect  || "back")
			} else {
				await filterResponseError(req, res, formRes.status, formRes.error)
			}
		})

		app.post(`/ajax${form.path}`, async (req, res) => {

			const rootDataset = createRootDataset(req, true)

			const formRes = await form.executeFormEncoded(rootDataset, req.body)

			if (formRes.status < 400) {
				setCookies(res, formRes.cookies)
				res.status(formRes.status)
				HTML.serialize(formRes.elements, res)
			} else {
				res.status(formRes.status).send(formRes.error || DefaultError(formRes.status))
			}
		})

		app.post(`/api${form.path}`, Express.json(), async (req, res) => {
			const rootDataset = createRootDataset(req, true)

			const formRes = await form.execute(rootDataset, req.body)

			if (formRes.status < 400) {
				setCookies(res, formRes.cookies)
				res.status(formRes.status).json({})
			} else {
				res.status(formRes.status).json({
					code: formRes.status,
					message: formRes.error
				})
			}
		})

		app.get(`/api/${form.name}`, (_, res) => {
			res.json({ inputSchema:form.inputSchema })
		})
	}

	//
	// Expose portals
	//

	for (const portal of vtmlDocument.portals) {
		debug("Create portal", portal.path)

		app.get(portal.path, async (req, res) => {
			const rootDataset = createRootDataset(req, false)
	
			const portalRes = await portal.load(rootDataset)

			
			if (portalRes.status < 400) {
				setCookies(res, portalRes.cookies)
				res.status(portalRes.status)
				HTML.serialize(portalRes.elements, res)
			} else {
				res.status(portalRes.status).send(portalRes.error || DefaultError(portalRes.status))
			}
		})
	}

	// Expose api docs
	app.use("/api-docs", SwaggerUiExpress.serve, SwaggerUiExpress.setup(vtmlDocument.oapiSchema))
	app.use("/api/_schema.json", (_, res) => res.json(vtmlDocument.oapiSchema))


	const pages = vtmlDocument.getPages()

	for (const path of pages) {
		debug("page found", path)
		app.all(path, renderLoader())
	}

	if (pages.length === 0) {
		// If no pages were defined we may be a
		// single page app so create a default route.

		app.all("/", renderLoader())
	}

	// Exposes

	for (const expose of vtmlDocument.exposes) {
		app.get(expose.path, async (req, res) => {
			const rootDataset = createRootDataset(req, false)
			const exposeResult = await expose.load(rootDataset)

			// Redirect if required
			if (exposeResult.redirect) {
				debug("response redirect", exposeResult.redirect)
				res.redirect(307, exposeResult.redirect)

			} else if (exposeResult.status < 400) {
				// Set the contentType if one was provided
				if (exposeResult.contentType) {
					res.setHeader("Content-Type", exposeResult.contentType)
				}
				res.sendFile(exposeResult.sendFile, {
					root: process.cwd(),
				})

			} else {
				// Send basic error

				res.status(exposeResult.status)
					.send(exposeResult.error || DefaultError(exposeResult.status))
			}

		})
	}

	// A fallback for favicon to avoid the whole page rendering
	app.get("/favicon.ico", (_, res) => res.status(404).send("Not found"))

	// Fallback 404 page
	app.all("/*", (req, res) => {
		filterResponseError(req, res, 404)
	})


	// Determine the listen port in order of
	// - cli arg
	// - env
	// - hint
	// - default (3000)
	const portStr = options.cliPort?.toString() || process.env['PORT'] || vtmlDocument.findHint("v-hint-port", "port") || "3000"
	const port = parseInt(portStr)

	if (isNaN(port)) {
		throw Error(`Invalid port ${port}`)
	}

	const listenAddr = options.cliListen || "localhost"

	app.listen(port, listenAddr, () => console.log(`Started on ${listenAddr}:${port}`))
}
