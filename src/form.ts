import {createPostFormApiSchema, SchemaObject, ParameterObject, createPathParameters, expressToOapiPath} from "./oapi"
import type {RootDataset, InputValue, BodyType, ElementChain, FormResult} from "./types"
import pathLib from "path"
import type {TagElement} from "./html"
import * as utils from "./utils"
import Ajv, {ValidationError} from "ajv"
import AjvFormats from "ajv-formats"

import FilterContext from "./filter_context"
import {prepareChain, createFormFilter} from "./filter"

const ajv = new Ajv()
AjvFormats(ajv)

function formatValidationError(e:ValidationError): string {
	return e.message +" : "+ e.errors[0].message
}

function simpleToTime(timeStr:string): string {
	// This function is neccesary due to the slightly different
	// ways that browsers can shorten "time" input values.
	//
	// They can come out as 
	// - 00:00
	// --- or ---
	// - 00:00:00

	if (timeStr.length < 6) {
		timeStr += ":00"
	}

	if (timeStr.length < 9) {
		timeStr += ".000"
	}

	return timeStr + "Z"
}

function parseFormInput(value:string, input:TagElement): boolean|string|number {
	const type = utils.getAttribute(input, "type")
	switch (type) {
		case "checkbox":
			return (value === "on")
		case "time":
			return simpleToTime(value)
		case "datetime-local":
			return value +":00.000Z"
		case "number":
		case "range":
			return parseFloat(value)
		default:
			return value
	}
}

function asArray(v:string|string[]): string[] {
	return Array.isArray(v)? v : [v]
}

function parseFormSelect(value:string, field:TagElement): string|string[] {
	const isMulti = utils.getBoolAttribute(field, "multiple")
	return isMulti ? asArray(value) : value
}

function parseFormField(value:string, field:TagElement): InputValue {
	if (field.name === "input") {
		return parseFormInput(value, field)
	} else if (field.name === "select") {
		return parseFormSelect(value, field)
	} else {
		return value
	}
}

function parseFormFields(body:Record<string, string>, formFields:TagElement[]): BodyType {
	const newBody: BodyType = {}

	for (const field of formFields) {
		const name = utils.getAttribute(field, "name")
		if (! name) continue

		const value = body[name]
		newBody[name] = parseFormField(value, field)
	}

	return newBody
}

function getPagePath(preElements:ElementChain[]): string {
	const elements = preElements.map((chain) => chain.element).reverse()
	const pages = utils.findPagesInChain(elements)

	if (pages.length) {
		const page = pages[0]
		return utils.getAttribute(page, "path")
	} else {
		return "/"
	}
}

export
type FormDescriptor = {
	name: string
	path: string
	oapiPath: string

	element: TagElement
	inputSchema: SchemaObject
	parameters: ParameterObject[]
	execute: (rootDataset:RootDataset, body:BodyType) => Promise<FormResult>
	executeFormEncoded: (rootDataset:RootDataset, body:Record<string, string>) => Promise<FormResult>
}

export default
function prepareForm(postForm:TagElement, preElements:ElementChain[]): FormDescriptor {
	
	const xName = utils.getAttribute(postForm, "x-name")

	if (! xName) {
		utils.error(postForm, `No x-name set`)
	}

	// Get the path of the nearest page
	const pagePath = getPagePath(preElements)

	// Figure out the form path suffix
	const path = pathLib.posix.join(pagePath, xName)

	// The oapi path is slightly different
	const oapiPath = expressToOapiPath(path)

	const chain = prepareChain(preElements)

	// Create the action filter
	const filterAction = createFormFilter(postForm)

	// Create OAPI schema
	const inputSchema = createPostFormApiSchema(postForm)

	// Create OAPI parameters
	const parameters = createPathParameters(pagePath)

	// Find all inputs (and selects, and textareas)
	const formInputs = utils.findInputs(postForm)

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
			const chainResult = await chain(preCtx)

			// If the form would otherwise not be rendered by the
			// loader then it is in a 'not found' state and therefore
			// should return 404.
			if (! chainResult.found) {
				const cookies = chainResult.ctx.GetCookies()
				return { status:404, cookies, elements:[] }
			}

			// If any elements in the chain set the return code to
			// a non-success code then we should assume that the form
			// would otherwise not be available.
			const chainCode = chainResult.ctx.GetReturnCode()
			if (chainCode >= 400) {
				return {
					status: chainCode,
					cookies: {},
					elements: [],
				}
			}

			// If the chain Would otherwise redirect before rendering
			// the form we must assume that it is not visible and return
			// the redirect.
			//
			// This would be for things such as redirecting to a login
			// page when a session has expired.
			const chainRedirect = chainResult.ctx.GetRedirect()
			if (chainRedirect) {
				return {
					status: 307,
					cookies: {},
					elements: [],
					redirect: chainRedirect,
				}
			}


			// Finally we execute the action with the filter context
			// of the preceeding chain.
			const {ctx, elements} = await filterAction(chainResult.ctx)
			
			// Extract globals from the Context and create a RenderResponse
			const cookies = ctx.GetCookies()
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
				const error = (e instanceof Error) ? e.message : ""
				return { status:500, cookies:{}, elements:[], error }
			}
		}
	}

	/*
	 * Create an executor for when we have a form-encoded body
	 */
	async function executeFormEncoded(rootDataset:RootDataset, formBody:Record<string, string>) {
		
		const body = parseFormFields(formBody, formInputs)
		return execute(rootDataset, body)
	}

	return {
		name: xName,
		element: postForm,
		path,
		oapiPath,
		parameters,

		inputSchema,
		execute,
		executeFormEncoded,
	}
}
