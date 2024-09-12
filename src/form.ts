import {createPostFormApiSchema, createPathParameters, expressToOapiPath} from "./oapi"
import type {SchemaObject, ParameterObject} from "./oapi"
import type {RootDataset, InputValue, BodyType, TagBlock, FormResult} from "./types"
import * as utils from "./utils"
import Ajv, {ValidationError} from "ajv"
import AjvFormats from "ajv-formats"
import DefaultError, {ServerError} from "./default_errors"

import FilterContext from "./filter_context"

export type FileMap = { [fieldname:string]: string }

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

function parseFormInput(value:string, input:TagBlock): boolean|string|number {
	const type = input.attr("type")
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

function parseFormSelect(value:string, field:TagBlock): string|string[] {
	const isMulti = field.boolAttr("multiple")
	return isMulti ? asArray(value) : value
}

function parseFormField(value:string, field:TagBlock): InputValue {
	const name = field.getName()
	if (name === "input") {
		return parseFormInput(value, field)
	} else if (name === "select") {
		return parseFormSelect(value, field)
	} else {
		return value
	}
}

function parseFormFields(body:Record<string, string>, formFields:TagBlock[]): BodyType {
	const newBody: BodyType = {}

	for (const field of formFields) {
		const name = field.attr("name")
		if (! name) continue

		const value = body[name]
		newBody[name] = parseFormField(value, field)
	}

	return newBody
}

function getFileFields(postForm:TagBlock): FileField[] {
	return postForm.FindAll(utils.byName("input"))         // Find inputs
		.filter((block) => block.attr("type") === "file")  // with type="file"
		.map((block) => ({ name:block.attr("name") }))     // get the name
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

	uploadFields: FileField[]

	inputSchema: SchemaObject
	parameters: ParameterObject[]
	execute: (rootDataset:RootDataset, body:BodyType) => Promise<FormResult>
	executeFormEncoded: (rootDataset:RootDataset, body:Record<string, string>, files:FileMap) => Promise<FormResult>
}

export default
function prepareForm(postForm:TagBlock): FormDescriptor {
	
	const xName = postForm.attr("v-name")

	// Get the path of the nearest page
	const pagePath = postForm.findAncestor(utils.byName("v-page"))?.attr("path") || "/"

	const encoding = postForm.attr("enctype")

	// Figure out the form path suffix
	const path = utils.joinPaths(pagePath, xName)

	// The oapi path is slightly different
	const oapiPath = expressToOapiPath(path)

	// Create the action filter
	const isolate = postForm.Isolate()

	// Create OAPI schema
	const inputSchema = createPostFormApiSchema(postForm)

	// Create OAPI parameters
	const parameters = createPathParameters(pagePath)

	// Find all inputs (and selects, and textareas)
	const formInputs = postForm.FindAll(matchInputs)

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

			// If any elements in the chain set the error
			// then we should assume that the form
			// would otherwise not be available.
			if (ctx.InError()) {
				return {
					status: ctx.GetReturnCode(),
					error: ctx.GetErrorMessage(),
					cookies: {},
					elements: [],
				}
			}

			// If the form would otherwise not be rendered by the
			// loader then it is in a 'not found' state and therefore
			// should return 404.
			if (! found) {
				const cookies = ctx.GetCookies()
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
					cookies: {},
					elements: [],
					redirect: chainRedirect,
				}
			}
			
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
				return { status:500, cookies:{}, elements:[], error:ServerError }
			}
		}
	}

	/*
	 * Create an executor for when we have a form-encoded body
	 */
	async function executeFormEncoded(rootDataset:RootDataset, formBody:Record<string, string>, files:FileMap) {
		
		const body = parseFormFields(formBody, formInputs)
		return execute(rootDataset, { ...body, ...files })
	}

	return {
		name: xName,
		path,
		oapiPath,
		parameters,
		encoding,
		uploadFields: fileFields,

		inputSchema,
		execute,
		executeFormEncoded,
	}
}
