import {createPostFormApiSchema, createPathParameters, expressToOapiPath} from "./oapi"
import type {SchemaObject, ParameterObject} from "./oapi"
import type {RootDataset, BodyType, TagBlock, FormResult} from "./types"
import * as utils from "./utils"
import Ajv, {ValidationError} from "ajv"
import AjvFormats from "ajv-formats"
import DefaultError, {ServerError} from "./default_errors"
import httpEncParser from "./http_encoding"

import FilterContext from "./filter_context"

export type FileMap = { [fieldname:string]: string }
export type Method = "post"|"put"|"delete"|"patch"


const ajv = new Ajv()
AjvFormats(ajv)

function formatValidationError(e:ValidationError): string {
	return e.message +" : "+ e.errors[0].message
}

export
function matchInputs(block:TagBlock): boolean {
	const inputTypes = ["input", "select", "textarea"]
	const excludedTypes = ["submit", "reset", "button"]

	const name = block.getName()
	const type = block.attr("type")
	return inputTypes.includes(name) && !excludedTypes.includes(type)
}

function findInputs(block:TagBlock){
	return block.FindAll(matchInputs)
}


function getFileFields(postForm:TagBlock): FileField[] {
	return postForm.FindAll(utils.byName("input"))         // Find inputs
		.filter((block) => block.attr("type") === "file")  // with type="file"
		.map((block) => ({ name:block.attr("name") }))     // get the name
}

const validMethods:Method[] = [
	"post",
	"delete",
	"put",
	"patch",
]

function isValidMethod(method:string): method is Method {
	return validMethods.includes(method as Method)
}

type FileField = {
	name: string
}

export
type FormDescriptor = {
	name: string
	path: string
	oapiPath: string
	encoding: string
	method: Method

	uploadFields: FileField[]

	inputSchema: SchemaObject
	parameters: ParameterObject[]
	execute: (rootDataset:RootDataset, body:BodyType) => Promise<FormResult>
	executeFormEncoded: (rootDataset:RootDataset, body:Record<string, string>, files:FileMap) => Promise<FormResult>
}

export default
function prepareForm(postForm:TagBlock): FormDescriptor {
	
	const xName = postForm.attr("v-name")
	const method = postForm.attr("method").toLowerCase() || "post"

	// Get the path of the nearest page
	const pagePath = postForm.findAncestor(utils.byName("v-page"))?.attr("path") || "/"

	const encoding = postForm.attr("enctype")

	// Error if method is not valid
	if (!isValidMethod(method)) {
		postForm.error(`Form method '${method}' is not valid. Must be one of ${validMethods.join(", ")}`)
	}

	// Figure out the form path suffix
	const path = postForm.attr("action") || utils.joinPaths(pagePath, xName)

	if (!path.startsWith(pagePath)) {
		postForm.error(`Form action ${path} must extend it's parent page ${pagePath}`)
	}

	// The oapi path is slightly different
	const oapiPath = expressToOapiPath(path)

	// Find the action element
	const vAction = postForm.Find(utils.byName("v-action"))

	// Throw if no action was found (it wouldn't do anything)
	if (! vAction) {
		throw Error(`No v-action defined in vtml form`)
	}

	// Create the action isolate
	const isolate = vAction.Isolate()

	// Create OAPI schema
	const inputSchema = createPostFormApiSchema(postForm)

	// Create OAPI parameters
	const parameters = createPathParameters(pagePath)

	// Find all relevent inputs
	const formInputs = findInputs(postForm)

	// Create http encoding parser
	const encParser = httpEncParser(formInputs)

	// Find all file fields
	const fileFields = getFileFields(postForm)

	// Initialize validator
	const validator = ajv.compile({ ...inputSchema, $async:true })

	/*
	 * Create an executor to call this form with a parsed (but not validated) body
	 */
	async function execute(rootDataset:RootDataset, body:BodyType): Promise<FormResult> {
		try {

			// Run the validator. This will throw an error on failure.
			await validator(body)

			// Set the body in the root dataset
			rootDataset.body = body

			const preCtx = FilterContext.Init(rootDataset)

			// Execute the chain, which is all elements above or
			// preceeding this form.
			const {elements, found, ctx} = await isolate(preCtx)

			const cookies = ctx.GetCookies()

			// If any elements in the chain set the error
			// then we should assume that the form
			// would otherwise not be available.
			if (ctx.InError()) {
				return {
					status: ctx.GetReturnCode(),
					error: ctx.GetErrorMessage(),
					cookies,
					elements: [],
				}
			}

			// If the form would otherwise not be rendered by the
			// loader then it is in a 'not found' state and therefore
			// should return 404.
			if (! found) {
				return { status:404, cookies, elements:[], error:DefaultError(404) }
			}


			// If the chain Would otherwise redirect before rendering
			// the form we must assume that it is not visible and return
			// the redirect.
			//
			// This would be for things such as redirecting to a login
			// page when a session has expired.
			const chainRedirect = ctx.GetRedirect()
			if (chainRedirect) {
				return {
					status: 307,
					cookies,
					elements: [],
					redirect: chainRedirect,
				}
			}
			
			// Extract globals from the Context and create a RenderResponse
			const status = ctx.GetReturnCode()
			const redirect = ctx.GetRedirect()

			return { status, cookies, elements, redirect }

		} catch (e:unknown) {
			console.error(e)

			if (e instanceof ValidationError) {
				// ValidationError is thrown by the validator and should
				// be assumed to be a 400 error
				const error = formatValidationError(e)
				return { status:400, cookies:{}, elements:[], error }
			} else {
				// Otherwise we assume a 500 error and just return it.
				return { status:500, cookies:{}, elements:[], error:ServerError }
			}
		}
	}

	/*
	 * Create an executor for when we have a form-encoded body
	 */
	async function executeFormEncoded(rootDataset:RootDataset, formBody:Record<string, string>, files:FileMap) {
		
		const body = encParser(formBody)
		return execute(rootDataset, { ...body, ...files })
	}

	return {
		name: xName,
		path,
		method,
		oapiPath,
		parameters,
		encoding,
		uploadFields: fileFields,

		inputSchema,
		execute,
		executeFormEncoded,
	}
}
