import {createPostFormApiSchema, SchemaObject, ParameterObject, createPathParameters, expressToOapiPath} from "./oapi"
import type {RootDataset, InputValue, ElementChain, FormResult} from "./types"
import pathLib from "path"
import type {TagElement} from "./html"
import * as utils from "./utils"
import Ajv from "ajv"
import AjvFormats from "ajv-formats"

import FilterContext from "./filter_context"
import {prepareChain, createFormFilter} from "./filter"

const ajv = new Ajv()
AjvFormats(ajv)

function simpleToTime(timeStr:string): string {
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

function parseFormFields(body:Record<string, string>, formFields:TagElement[]): Record<string, InputValue> {
	const newBody: Record<string, InputValue> = {}

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
	return: string
	inputSchema: SchemaObject
	parameters: ParameterObject[]
	execute: (rootDataset:RootDataset, body:Record<string, InputValue>) => Promise<FormResult>
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
	async function execute(rootDataset:RootDataset, body:Record<string, InputValue>): Promise<FormResult> {
		await validator(body)
		rootDataset.body = body

		const preCtx = FilterContext.Init(rootDataset)

		const chainResult = await chain(preCtx)

		if (! chainResult.found) {
			return { ctx:preCtx, found:false, elements:[] }
		}

		const ctx = chainResult.ctx

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
		element: postForm,
		path,
		oapiPath,
		parameters,

		return: xReturn,
		inputSchema,
		execute,
		executeFormEncoded,
	}
}
