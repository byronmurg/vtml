import {createPostFormApiSchema, SchemaObject, ParameterObject, createPathParameters, expressToOapiPath} from "./oapi"
import type {RootDataset, ElementChain, FormResult} from "./types"
import pathLib from "path"
import type {Element} from "./html"
import * as utils from "./utils"
import Ajv, {ValidationError} from "ajv"
import FilterContext from "./filter_context"
import NodeFunction from "./node"
import {prepareChain, createFormFilter} from "./filter"

const ajv = new Ajv()

function parseFormInput(value:string, input:Element): any {
	const type = utils.getAttribute(input, "type")
	switch (type) {
		case "checkbox":
			return (value === "on")
		case "number":
		case "range":
			return parseFloat(value)
		default:
			return value
	}
}

function asArray(v:unknown): any {
	return Array.isArray(v)? v : [v]
}

function parseFormSelect(value:string, field:Element): any {
	const isMulti = utils.getBoolAttribute(field, "multiple")
	return isMulti ? asArray(value) : value
}

function parseFormField(value:string, field:Element): any {
	if (field.name === "input") {
		return parseFormInput(value, field)
	} else if (field.name === "select") {
		return parseFormSelect(value, field)
	} else {
		return value
	}
}

function parseFormFields(body:Record<string, any>, formFields:Element[]): Record<string, any> {
	const newBody: Record<string, any> = {}

	for (const field of formFields) {
		const name = utils.getAttribute(field, "name")
		if (! name) continue

		let value = body[name]
		newBody[name] = parseFormField(value, field)
	}

	return newBody
}

function getPagePath(preElements:ElementChain[]): string {
	const elements = preElements.map((chain) => chain.element).reverse()
	const pages = utils.findPages(elements)

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

	return: string
	inputSchema: SchemaObject
	parameters: ParameterObject[]
	execute: (rootDataset:RootDataset, body:Record<string, any>) => Promise<FormResult>
	executeFormEncoded: (rootDataset:RootDataset, body:Record<string, any>) => Promise<FormResult>
}

export default
function prepareForm(postForm:Element, preElements:ElementChain[]): FormDescriptor {
	
	const xName = utils.getAttribute(postForm, "x-name")

	if (! xName) {
		throw Error(`No x-name set in POST form`)
	}

	// Get the path of the nearest page
	const pagePath = getPagePath(preElements)

	// Figure out the form path suffix
	const path = pathLib.posix.join(pagePath, xName)

	// The oapi path is slightly different
	const oapiPath = expressToOapiPath(path)

	const chain = prepareChain(preElements)

	const xReturn = utils.getAttribute(postForm, "x-return") || ""

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
	async function execute(rootDataset:RootDataset, body:Record<string, any>): Promise<FormResult> {
		await validator(body)
		rootDataset.body = body

		const preCtx = FilterContext.Init(rootDataset)

		const chainResult = await chain(preCtx)

		if (! chainResult.found) {
			return { ctx:preCtx, found:false, elements:[] }
		}

		let ctx = chainResult.ctx

		const output = await filterAction(ctx)

		return {ctx:output.ctx, found:true, elements:output.elements}
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
		path,
		oapiPath,
		parameters,
		return: xReturn,
		inputSchema,
		execute,
		executeFormEncoded,
	}
}
