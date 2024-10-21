import CreateFormInputSchema from "../form_jsonschema"
import type {SchemaObject} from "../oapi"
import type {RootDataset, BodyType, TagBlock, FormResult, InitializationResponse} from "../types"
import * as utils from "../utils"
import Ajv, {ValidationError} from "ajv"
import AjvFormats from "ajv-formats"
import DefaultError, {ServerError} from "../default_errors"
import httpEncParser from "../http_encoding"
import ValidationSet from "../validation_set"

import FilterContext from "../filter_context"

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

export
function findInputs(block:TagBlock){
	return block.FindAll(matchInputs)
}

function findOptions(block:TagBlock) {
	return block.FindAll(utils.byName("option"))
}

function ensureThatOptionHasOneTextChild(option:TagBlock): InitializationResponse<void> {
	if (option.hasNonTextChildren()) {
		return option.Fail("has invalid body")
	} else {
		return utils.Ok(undefined)
	}
}

function ensureInputIsNamed(input:TagBlock): InitializationResponse<void> {
	if (! input.attr("name")) {
		return input.Fail("attribute 'name' required")
	} else {
		return utils.Ok(undefined)
	}
}

function ValidateFormInputs(form:TagBlock): InitializationResponse<unknown> {
	// As a VTML form there are additional requirements on the form inputs
	// such as most inputs needing a name etc. We perform that here before any
	// additional processing

	return utils.ValidateAgg(
		...findInputs(form).map(ensureInputIsNamed),
		...findOptions(form).map(ensureThatOptionHasOneTextChild),
	)
}



function getFileFields(postForm:TagBlock): FileField[] {
	return postForm.FindAll(utils.byName("input"))            // Find inputs
		.filter((block) => block.attr("type") === "file")     // with type="file"
		.map((block) => ({ name:block.requireAttr("name") })) // get the name
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
	encoding: string
	method: Method
	block: TagBlock

	setCookie: boolean
	usedCookies: string[]
	usedHeaders: string[]
	usedQueryVars: string[]

	uploadFields: FileField[]
	outputSchema?: SchemaObject

	inputSchema: SchemaObject
	execute: (rootDataset:RootDataset, body:BodyType) => Promise<FormResult>
	executeFormEncoded: (rootDataset:RootDataset, body:Record<string, string>, files:FileMap) => Promise<FormResult>
}

function findGlobals(globals:string[], prefix:string) {
	// Given an array of globals passed into an element, find any with the
	// supplied prefix e.g $.cookies.foo cookies => foo

	const ret:string[] = []
	const regex = new RegExp(`\\$\\.${prefix}\\.(\\w+)`)
	for (const globalVar of globals) {
		if (globalVar.startsWith(`$.${prefix}.`)) {
			const match = globalVar.match(regex)
			if (! match) {
				throw Error(`Malformed ${prefix} name ${globalVar}`)
			}
			const cookieName = match[1]

			ret.push(cookieName)
		}
	}
	return ret
}

function ensureThatNoInputsAreConditionallyRendered(portForm:TagBlock): InitializationResponse<void> {
	const vtmlBlocks = portForm.FindAll((el) => el.getName().startsWith("v-"))

	for (const vtmlBlock of vtmlBlocks) {
		// v-actions are allowed to contain inputs
		if (vtmlBlock.getName() === "v-action") {
			continue
		}

		const inputs = vtmlBlock.FindAll(matchInputs)
		if (inputs.length) {
			const err = vtmlBlock.mkError(`cannot contain inputs when inside a form`)
			return utils.Err(err)
		}
	}

	return utils.Ok(undefined)
}

export default
function prepareForm(postForm:TagBlock): InitializationResponse<FormDescriptor> {
	
	const xName = postForm.attr("v-name")
	const method = postForm.attr("method").toLowerCase() || "post"

	const validationSet = new ValidationSet(postForm)

	// Get the path of the nearest page
	const pagePath = utils.findNearestPagePath(postForm)

	const encoding = postForm.attr("enctype")

	// Figure out the form path suffix
	const path = postForm.attr("action") || utils.joinPaths(pagePath, xName)

	if (!path.startsWith(pagePath)) {
		validationSet.error(`Form action ${path} must extend it's parent page ${pagePath}`)
	}

	// Error if method is not valid
	if (!isValidMethod(method)) {
		return validationSet.Fatal(`Form method '${method}' is not valid. Must be one of ${validMethods.join(", ")}`)
	}

	// Perform additional input checks
	const inputResult = ValidateFormInputs(postForm)
	validationSet.AddResult(inputResult)

	// Find the action element
	const vAction = postForm.Find(utils.byName("v-action"))

	// Throw if no action was found (it wouldn't do anything)
	if (! vAction) {
		return validationSet.Fatal(`No v-action defined`)
	}

	if (! validationSet.isOk) {
		return validationSet.Fail()
	}

	// Check that no inputs are rendered conditionaly
	const icrResult = ensureThatNoInputsAreConditionallyRendered(postForm)
	if (! icrResult.ok) {
		return icrResult
	}

	// Create the action isolate
	const isolate = vAction.Isolate()

	// Create OAPI schema
	const inputSchema = CreateFormInputSchema(postForm)

	// Find all relevent inputs
	const formInputs = findInputs(postForm)

	// Create http encoding parser
	const encParser = httpEncParser(formInputs)

	// Find all file fields
	const fileFields = getFileFields(postForm)

	// Initialize validator
	const validator = ajv.compile({ ...inputSchema, $async:true })

	// Figure out if it will set a cookie
	const setCookie = !!vAction.Find(utils.byName("v-set-cookie"))

	// Find if it has an output tag
	const outputTag = vAction.Find(utils.byName("v-output"))
	const outputSchemaBody = outputTag?.getOneTextChild()
	const outputSchema = outputSchemaBody ? JSON.parse(outputSchemaBody) : undefined

	// Find any globals required by the form
	const usedCookies = findGlobals(isolate.globals, "cookies")
	const usedQueryVars = findGlobals(isolate.globals, "query")
	const usedHeaders = findGlobals(isolate.globals, "headers")

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
			const {elements, found, ctx} = await isolate.run(preCtx)

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
			
			// Extract globals from the Context and create a RenderResponse
			const status = ctx.GetReturnCode()
			const redirect = ctx.GetRedirect()
			const output = ctx.GetApiOutput()

			return { status, cookies, elements, redirect, output }

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

	return utils.Ok({
		name: xName,
		block: postForm,
		path,
		method,
		encoding,
		uploadFields: fileFields,

		setCookie,
		usedCookies,
		usedHeaders,
		usedQueryVars,

		inputSchema,
		outputSchema,
		execute,
		executeFormEncoded,
	})
}
