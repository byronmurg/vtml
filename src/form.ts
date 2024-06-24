import {createPostFormApiSchema, SchemaObject} from "./oapi"
import type {RootDataset} from "./types"
import type {Element} from "./html"
import * as utils from "./utils"
import Ajv, {ValidationError} from "ajv"
import FilterContext from "./filter_context"
import createFormActions from "./form_action"
import NodeFunction from "./node"

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


export
type FormDescriptor = {
	name: string
	return: string
	inputSchema: SchemaObject
	execute: (rootDataset:RootDataset, body:Record<string, any>) => Promise<FilterContext>
	executeFormEncoded: (rootDataset:RootDataset, body:Record<string, any>) => Promise<FilterContext>
}

export default
function prepareForm(postForm:Element): FormDescriptor {
	
	const xName = utils.getAttribute(postForm, "x-name")

	if (! xName) {
		throw Error(`No x-name set in POST form`)
	}

	const xReturn = utils.getAttribute(postForm, "x-return") || ""

	// Turn the action elements into form actions
	const actions = createFormActions(postForm)

	// Create OAPI schema
	const inputSchema = createPostFormApiSchema(postForm)

	// Find all inputs (and selects, and textareas)
	const formInputs = utils.findInputs(postForm)

	// Initialize validator
	const validator = ajv.compile({ ...inputSchema, $async:true })

	/*
	 * Create an executor to call this form with a parsed (but not validated) body
	 */
	async function execute(rootDataset:RootDataset, body:Record<string, any>): Promise<FilterContext> {
		await validator(body)
		rootDataset.body = body

		let ctx = FilterContext.Init(rootDataset)

		for (const action of actions) {
			ctx = await action(ctx)
		}

		return ctx
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
		return: xReturn,
		inputSchema,
		execute,
		executeFormEncoded,
	}
}
