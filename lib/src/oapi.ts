import type VtmlDocument from "./document"
import type * as OAPI from "openapi3-ts/oas31"
import {getPathParameters} from "./isolates/page"
import type {FormDescriptor} from "./isolates/form"
export type * from "openapi3-ts/oas31"


export
function createPathParameters(path:string): OAPI.ParameterObject[] {
	const parts = getPathParameters(path)

	return parts.map((part) => ({
		in: "path",
		name: part,
		schema: { type:"string" },
		required: true,
	}))
}

function createCookieParameters(form:FormDescriptor): OAPI.ParameterObject[] {

	return form.usedCookies.map((cookie) => ({
		name: cookie,
		in: "cookie",
		required: true,
		schema: { type:"string" }
	}))
}

function createHeaderParameters(form:FormDescriptor): OAPI.ParameterObject[] {

	return form.usedHeaders.map((header) => ({
		name: header,
		in: "header",
		required: true,
		schema: { type:"string" }
	}))
}

function createQueryParameters(form:FormDescriptor): OAPI.ParameterObject[] {

	return form.usedQueryVars.map((v) => ({
		name: v,
		in: "query",
		schema: { type:"string" }
	}))
}

export
function expressToOapiPath(path:string): string {
	return path.replace(/:\w+/g, (p) => `{${p.substr(1)}}`)	
}

const defaultOutputSchema = {
	type: "object",
	properties: { code:{ type:"number" } },
}

function createFormApi(form:FormDescriptor): OAPI.OperationObject {
	const headers: OAPI.ResponseObject["headers"] = {}

	if (form.setCookie) {
		headers["Set-Cookie"] = {
			schema: {
				type:"string",
			}
		}
	}

	const cookieParameters = createCookieParameters(form)
	const headerParameters = createHeaderParameters(form)
	const queryParameters = createQueryParameters(form)
	const pathParameters = createPathParameters(form.path)

	const parameters = [
		...cookieParameters,
		...headerParameters,
		...queryParameters,
		...pathParameters,
	]

	return {
		operationId: form.name,
		parameters,
		requestBody: {
			required: true,
			content: {
				"application/json": {
					schema: form.inputSchema,
				}
			}
		},
		responses: {
			"200": {
				description: "Successful operation",
				headers,
				content: {
					"application/json": {
						schema: form.outputSchema || defaultOutputSchema
					}
				}
			},
			"400": {
				description: "Invalid input",
				content: {
					"application/json": {
				  		schema: { $ref:"#/components/schemas/error" }
					}
				},
			},
			"401": {
				description: "Unauthorized",
				content: {
					"application/json": {
				  		schema: { $ref:"#/components/schemas/error" }
					}
				},
			},
			"403": {
				description: "Forbidden",
				content: {
					"application/json": {
				  		schema: { $ref:"#/components/schemas/error" }
					}
				},
			},
			"404": {
				description: "Target not found",
				content: {
					"application/json": {
				  		schema: { $ref:"#/components/schemas/error" }
					}
				},
			},
			// @TODO rest of these
		}
	}
	
}

export
function createOpenApiSchema(doc:VtmlDocument): OAPI.OpenAPIObject {
	const title = doc.title || "Vtml"

	const apiPaths: OAPI.OpenAPIObject["paths"] = {}
	const apiSpec: OAPI.OpenAPIObject = {
		openapi: "3.1.0",
		info: {
			title: title+" api",
			version: "1.0",
		},
		paths: apiPaths,
		components: {
			schemas: {
				"error": {
					title: "Error",
					type: "object",
					properties: {
						code: { type:"number" },
						message: { type:"string" },
					},
				}
			}
		},
	}

	for (const form of doc.forms) {

		// The oapi path is slightly different
		const oapiPath = expressToOapiPath(form.path)

		apiPaths[`/_api${oapiPath}`] = {
			[form.method]: createFormApi(form)
		}
	}

	return apiSpec
}
