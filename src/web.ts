import Express from "express"
import BodyParser from "body-parser"
import CookieParser from "cookie-parser"
import Compression from "compression"
import Debug from "debug"
import DefaultError from "./default_errors"
import Multer from "multer"

import type {FileMap} from "./form"
import VtmlDocument from "./document"
import FilterContext from "./filter_context"
import type {RootDataset, ResponseError, CookieMap} from "./types"
import * as HTML from "./html"

const debug = Debug("vtml:web")
const multer = Multer({ storage:Multer.memoryStorage() })

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
		debug("set cookie", k, v.value)
		res.cookie(k, v.value, {maxAge})
	}
}

interface MulterFile {
	buffer: Buffer
}

function parseFiles(files:Record<string, MulterFile[]>|MulterFile[]|undefined): FileMap {
	if (files === undefined) return {}
	if (Array.isArray(files)) return {}

	const map:FileMap = {}

	for (const name in files) {
		map[name] = files[name][0].buffer.toString("hex")
	}
	return map
}

export
function exposeVtmlDocument(vtmlDocument:VtmlDocument, options:exposeOptions) {

	const app = Express()
	app.use(Compression())
	app.use(BodyParser.urlencoded({ extended:true }))
	app.use(CookieParser())
	app.disable("x-powered-by")

	//
	// Basic responses
	//

	async function renderFromContext(ctx:FilterContext, res:Express.Response) {
		debug("render loader")

		const response = await vtmlDocument.renderDocument(ctx)

		debug("response", response.status)
		setCookies(res, response.cookies)
		if (response.redirect) {
			debug("response redirect", response.redirect)
			res.redirect(307, response.redirect)
		} else {
			res.status(response.status)
			HTML.serializeHTML(response.elements, res)
		}
	}

	async function filterResponseError(req:Express.Request, res:Express.Response, status:number, error:string|undefined = undefined) {

		// If the document does not have a catch block at all then we can assume that
		// there is no way for the page to handle the error, and re-rendering might cause
		// the error to be thrown again.

		error = error || DefaultError(status)

		if (! vtmlDocument.hasCatch) {
			res.status(status).send(`
				<h3>${error}</h3>
			`)
			return
		}

		// Build an error FilterContext
		const err: ResponseError = {
			code: status,
			message: error,
		}
		const rootDataset = createRootDataset(req, false)
		const ctx = FilterContext.InitError(rootDataset, err)
		
		// Render with the error context
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

		const middlewares = []
		if (form.encoding === "multipart/form-data") {
			debug("Multipart form", form.name)
			const fields = form.uploadFields.map((field) => ({ name:field.name, maxCount:1 }))

			const fileHandler = form.uploadFields.length
				? multer.fields(fields)
				: multer.none()
				
			middlewares.push(fileHandler)
		}

		debug(`Create action ${form.path}`)
		app.post(form.path, ...middlewares, async (req, res) => {
			debug("form", form.name, "action")
			const rootDataset = createRootDataset(req, true)
			const files = parseFiles(req.files)

			const formRes = await form.executeFormEncoded(rootDataset, req.body, files)

			setCookies(res, formRes.cookies)
			if (formRes.status < 400) {
				res.redirect(307, formRes.redirect  || "back")
			} else {
				await filterResponseError(req, res, formRes.status, formRes.error)
			}
		})

		app.post(`/_ajax${form.path}`, ...middlewares, async (req, res) => {
			debug("form", form.name, "ajax")

			const rootDataset = createRootDataset(req, true)
			const files = parseFiles(req.files)

			const formRes = await form.executeFormEncoded(rootDataset, req.body, files)

			setCookies(res, formRes.cookies)
			if (formRes.status < 400) {
				res.status(formRes.status)
				HTML.serialize(formRes.elements, res)
			} else {
				res.status(formRes.status).send(formRes.error || DefaultError(formRes.status))
			}
		})

		app.post(`/_api${form.path}`, Express.json(), async (req, res) => {
			debug("form", form.name, "api")
			const rootDataset = createRootDataset(req, true)

			const formRes = await form.execute(rootDataset, req.body)

			setCookies(res, formRes.cookies)
			if (formRes.status < 400) {
				res.status(formRes.status).json({})
			} else {
				res.status(formRes.status).json({
					code: formRes.status,
					message: formRes.error
				})
			}
		})

		app.get(`/_api/${form.name}`, (_, res) => {
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
	app.use("/_api/_schema.json", (_, res) => res.json(vtmlDocument.oapiSchema))
	app.get("/_api/", (_, res) => {
		res.send(`
			<!doctype html>
			<html lang="en">
			  <head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
				<title>Elements in HTML</title>
			  
				<script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
				<link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css">
			  </head>
			  <body>

				<elements-api
				  apiDescriptionUrl="_schema.json"
				  router="hash"
				/>

			  </body>
			</html>
		`)
	})


	const pages = vtmlDocument.getPages()

	for (const page of pages) {
		debug("page found", page.path)
		app.all(page.path, renderLoader())

		app.get(`/_ajax${page.path}`, async (req, res) => {
			const rootDataset = createRootDataset(req, false)
			// Override the path as it doesn't match now
			rootDataset.path = req.path.replace(/^\/_ajax/, '')
			rootDataset.matchedPath = req.route.path.replace(/^\/_ajax/, '')

			const pageRes = await page.load(rootDataset)
			
			if (pageRes.status < 400) {
				setCookies(res, pageRes.cookies)
				res.status(pageRes.status)
				HTML.serialize(pageRes.elements, res)
			} else {
				res.status(pageRes.status).send(pageRes.error || DefaultError(pageRes.status))
			}
		})
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

	// For handling express errors
	app.use((err:Error, req:Express.Request, res:Express.Response, next:Express.NextFunction) => {
		if (res.headersSent) {
			return next(err)
		}

		filterResponseError(req, res, 500, err.message)
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
