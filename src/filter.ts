import * as utils from "./utils"
import type { Element } from "./html"
import type {Tag, RootFilter, TagFilter, Branch, Filter} from "./types"
import FilterContext from "./filter_context"
import {isFormAction} from "./form_action"
import doesLogicSelectorMatch from "./logic"
import Debug from "debug"
import NodeFunction from "./node"

const debug = Debug("starling:filter")

function filterPass(ctx:FilterContext, ...elements:Element[]): Branch {
	return {elements, ctx}
}

function childFilters(children:Element[]|undefined): Filter {
	children = children || []

	const childFilters = children.map(filterNode)

	return async (ctx:FilterContext): Promise<Branch> => {
		let subCtx = ctx
		const elements: Element[] = []

		for (const child of childFilters) {
			const subBranch = await child(subCtx)
			elements.push(...subBranch.elements)
			subCtx = subBranch.ctx
		}

		return { ctx, elements }
	}
}

function textFilter(el:Element): Filter {
	const textAttr = (el.text || "")
	return async (ctx:FilterContext): Promise<Branch> => {
		const text = ctx.templateString(textAttr.toString())
		const resp:Element = {
			...el,
			text,
		}
		return filterPass(ctx, resp)
	}
}

const stripFilter = (el:Element) => async (ctx:FilterContext) => filterPass(ctx)
const justReturnFilter = (el:Element) => async (ctx:FilterContext) => filterPass(ctx, el)

function filterNode(el:Element): Filter {
	switch (el.type) {
		case "element":
			return elementFilter(el)
		case "text":
			return textFilter(el)
		default:
			throw Error(`unknown element type ${el.type}`)
	}
}

const tags: Tag[] = [
	{
		name: "x-with",
		filter(el) {
			const source = utils.getSource(el)
			const content = childFilters(el.elements)
			return async (ctx) => {
				const sub = ctx.Select(source)
				if (!sub.dataset) {
					return filterPass(ctx)
				} else {
					const s = await content(sub)
					return { ctx, elements:s.elements }
				}
			}
		}
	},

	{
		name: "x-use",
		filter(el) {
			const source = utils.requireSourceAttribute(el)
			const content = childFilters(el.elements)
			return async (ctx) => {
				const sub = ctx.Select(source)
				const s = await content(sub)
				return { ctx, elements:s.elements }
			}
		}
	},

	// x-hints are just stripped here
	{
		name: "x-hint-port",
		filter: stripFilter,
	},

	{
		name: "form",
		filter(el) {
			// If it's not a POST I don't care
			if (el.attributes?.method !== "POST") {
				return filterHTML(el)
			} else {
				const xName = utils.requireAttribute(el, 'x-name')
				const nonActionChildren = utils.filterElement(el.elements||[], utils.not(isFormAction))

				// Only filter the remaining children
				const childs = childFilters(nonActionChildren)

				return async (ctx:FilterContext) => {
					const outputAttributes = templateAttributes(el.attributes, ctx)
					outputAttributes.action = `/action/${xName}`

					const children = await childs(ctx)

					const resp = {
						...el,
						attributes: outputAttributes,
						elements: children.elements,
					}
					
					return filterPass(ctx, resp)
				}
			}
		},
	},


	{
		name: "x-if",
		filter(el) {
			
			const attributes = utils.getAllAttributes(el)
			const source = utils.getSource(el)
			const childs = childFilters(el.elements)

			return async (ctx) => {
				const subCtx = ctx.Select(source)
				const doesMatch = doesLogicSelectorMatch(subCtx.dataset, attributes)

				if (doesMatch) {
					return await childs(ctx)
				} else {
					return filterPass(ctx)
				}
			}
		}
	},
	{
		name: "x-unless",
		filter(el) {
			
			const attributes = utils.getAllAttributes(el)
			const source = utils.getSource(el)
			const childs = childFilters(el.elements)

			return async (ctx) => {
				const subCtx = ctx.Select(source)
				const doesMatch = doesLogicSelectorMatch(subCtx.dataset, attributes)

				if (!doesMatch) {
					return await childs(ctx)
				} else {
					return filterPass(ctx)
				}
			}
		}
	},




	{
		name: "x-for-each",
		filter(el) {
			
			const source = utils.getSource(el)
			const childs = childFilters(el.elements)

			return async (ctx): Promise<Branch> => {
				const ctxs = ctx.Select(source).Split()

				const childBranches = await Promise.all(ctxs.map((s) => childs(s)))
				const elements = childBranches.flatMap((branch) => branch.elements)
				return { ctx, elements }
			}
		}
	},

	{
		name: "x-dump",
		filter(el) {
			return async (ctx): Promise<Branch> => {
				const resp: Element = {
					type: "element",
					name: "pre",
					attributes: el.attributes,
					elements: [
						{
							type: "text",
							text: JSON.stringify(ctx.dataset, null, 2)
						}
					]
				}

				return filterPass(ctx, resp)
			}
		}
	},


	{
		name: "x-page",
		filter(el) {
			const path = utils.requireAttribute(el, "path")
			const pathRegex = pathToRegex(path)
			const childs = childFilters(el.elements)

			return async (ctx): Promise<Branch> => {
				
				const requestPath = ctx.getKey("$.path")
				if (requestPath.match(pathRegex)) {
					debug("Match on page", path, pathRegex)
					return await childs(ctx)
				} else {
					return filterPass(ctx)
				}
			}
		}
	},

	{
		name: "x-default-page",
		filter(el) {
			const childs = childFilters(el.elements)
			return async (ctx): Promise<Branch> => {
				if (ctx.getKey("$.pageNotFound")) {
					return await childs(ctx)
				} else {
					return filterPass(ctx)
				}
			}
		}
	},


	{
		name: "input",
		filter(el) {
			// @NOTE Checkboxes have a slightly odd behaviour. HTML ticks a box if the
			// checked tag exists but the dev needs a way to set it from a template.
			if (el.name === "input" && utils.getAttribute(el, "type") === "checkbox") {
				const childs = childFilters(el.elements)
				return async (ctx): Promise<Branch> => {

					const checkedTmpl = utils.getAttribute(el, "checked")
					const v = checkedTmpl ? ctx.getKey(checkedTmpl) : ""
					const checked = (!!v) && v !== "off"

					const attrs = templateAttributes(el.attributes, ctx)
					if (! checked) {
						delete attrs["checked"]
					} else {
						attrs.checked = "on"
					}

					return filterPass(ctx, el)
				}
			} else {
				// Otherwise it's just a normal html element
				debug("input process as html")
				return filterHTML(el)
			}
		}
	},


	{
		name: "select",
		filter(el) {
			const childs = childFilters(el.elements)

			return async (ctx): Promise<Branch> => {

				const attrs = templateAttributes(el.attributes, ctx)
				const children = await childs(ctx)	
				for (const child of children.elements) {
					if (child.name === "option") {
						let value = utils.optAttribute(child, 'value')
						// The value may be set as a child
						if (value === undefined) {
							value = utils.getText(child)
						}

						if (value === attrs.value) {
							child.attributes = child.attributes || {}
							child.attributes.selected = "yes"
						}
					}
				}

				const resp: Element = {
					...el,
					attributes: attrs,
					elements: children.elements,
				}

				return filterPass(ctx, resp)
			}
		}
	},

	{
		name: "x-json",
		filter(el:Element) {
			
			const json = utils.requireOneTextChild(el)
			const targetAttr = utils.requireTargetAttribute(el)
			const jsonData = JSON.parse(json)

			return async (ctx): Promise<Branch> => {
				const nextCtx = ctx.SetVar(targetAttr, jsonData)
				return filterPass(nextCtx)
			}
		}
	},

	{
		name: "x-sql",
		filter(el:Element) {
			const query = utils.requireOneTextChild(el)
			const targetAttr = utils.requireTargetAttribute(el)

			return async (ctx): Promise<Branch> => {
				const nextCtx = await ctx.AddSQLDatasource(query, targetAttr)
				return filterPass(nextCtx)
			}
		}
	},

	{
		name: "x-nodejs",
		filter(el:Element) {
			const body = utils.requireOneTextChild(el)
			const targetAttr = utils.requireTargetAttribute(el)
			const idAttr = utils.getAttribute(el, "id")

			const nodeBody = NodeFunction(body, idAttr)
			
			return async (ctx): Promise<Branch> => {
				const resp = await nodeBody(ctx)

				// Set output to target
				const newCtx = ctx.SetVar(targetAttr, resp)

				// Pass with new ctx
				return filterPass(newCtx)
			}
		}
	},
]

function pathToRegex(path:string): RegExp {
	path = "^"+ path.replace(/:[\w]+/g, '[\\w,-]+') +"$"
	return new RegExp(path)
}




function elementFilter(el:Element): Filter {
	const name = el.name || ""

	const tag = tags.find((t) => t.name === name)

	if (tag) {
		return tag.filter(el)
	} else {
		// @TODO should be filter default
		// Throw if this is an unknown x- tag
		if (name.startsWith("x-")) {
			throw Error(`Unknown x- tag ${name}`)
		}

		return filterHTML(el)
	}
}

function filterHTML(el:Element): Filter {
	const childs = childFilters(el.elements)

	return async (ctx) => {
		const children = await childs(ctx)
		const resp:Element = {
			...el,
			attributes: templateAttributes(el.attributes, ctx),
			elements: children.elements,
		}
		return filterPass(ctx, resp)
	}
}

export default
function rootFilter(els:Element[]): RootFilter {
	const childs = childFilters(els)

	return async (ctx:FilterContext) => {
		const children = await childs(ctx)
		return children.elements
	}

}

// Attributes that are stripped out
const protectedAttributes = [
	"x-name",
]

// Attributes that cannot be templated
const passedAttributes = [
	"required",
	"name",
	"type",
	"method",
	"maxlength",
	"minlength",
	"max",
	"min",
	"pattern",
]

function templateAttributes(attrs:Element["attributes"], ctx:FilterContext) {
	const cpy:Element["attributes"] = {}

	for (const k in attrs) {
		const v = attrs[k]
		// If it's a string and not a protected attribute
		if (protectedAttributes.includes(k)) {
			continue
		} else if (passedAttributes.includes(k)) {
			// Passed attributes are not templated
			cpy[k] = v
		} else if (typeof(v) === "string") {
			// Template it
			cpy[k] = ctx.templateString(v)
		} else {
			cpy[k] = v
		}
	}

	return cpy
}
