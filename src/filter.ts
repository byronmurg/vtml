import {readFileSync} from "fs"
import pathLib from "path"
import * as utils from "./utils"
import type { Element } from "./html"
import type {Tag, RootFilter, FormResult, TagFilter, Branch, Filter, ElementChain} from "./types"
import YAML from "yaml"
import FilterContext from "./filter_context"
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


function elementFilter(el:Element): Filter {
	const name = el.name || ""

	const tag = findTag(el)

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

const stripFilter = (el:Element) => async (ctx:FilterContext) => filterPass(ctx)
const justReturnFilter = (el:Element) => async (ctx:FilterContext) => filterPass(ctx, el)

function bodyOrSrc(el:Element): string {
	const srcPath = utils.getAttribute(el, "src")
	if (srcPath) {
		return readFileSync(srcPath, "utf8")
	} else {
		return utils.requireOneTextChild(el)
	}
}

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
		},
		actionContains(el) {
			const source = utils.getSource(el)

			return (ctx) => {
				ctx = ctx.Select(source)
				const found = !!ctx.dataset
				return { ctx, found }
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
				const childs = childFilters(el.elements)

				return async (ctx:FilterContext) => {
					const path = ctx.getKey("$.path")
					const search = ctx.getKey("$.search")
					const searchStr = search ? `?${search}` : ""

					// Don't need extra slash if path is empty
					const fullPath = pathLib.posix.join(path, xName)
					const pathSuffix = `${fullPath}${searchStr}`

					const actionPath = `/action${pathSuffix}`
					const ajaxPath = `/ajax${pathSuffix}`

					ctx = ctx.SetVar('__form_action', actionPath)
						.SetVar('__form_ajax', ajaxPath)

					const outputAttributes = templateAttributes(el.attributes, ctx)
					outputAttributes.action ||= actionPath

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
		},

		actionContains(el) {
			// @TODO could be falled by filter
			const attributes = utils.getAllAttributes(el)
			const source = utils.getSource(el)

			return (ctx) => {
				const subCtx = ctx.Select(source)
				const found = doesLogicSelectorMatch(subCtx.dataset, attributes)
				return { ctx, found }
			}
		},
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
		},

		actionContains(el) {
			// @TODO could be called by filter
			const attributes = utils.getAllAttributes(el)
			const source = utils.getSource(el)

			return (ctx) => {
				const subCtx = ctx.Select(source)
				const found = !doesLogicSelectorMatch(subCtx.dataset, attributes)
				return { ctx, found }
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
				
				const matchPath = ctx.getKey("$.matchedPath")
				if (matchPath.startsWith(path)) {
					debug("Match on page", path)
					return await childs(ctx)
				} else {
					return filterPass(ctx)
				}
			}
		}
	},

	{
		name: "x-expose",
		filter: stripFilter,
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
			// @TODO write test case for this.
			if (utils.getAttribute(el, "type") === "checkbox") {
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
			
			const json = bodyOrSrc(el)
			const targetAttr = utils.requireTargetAttribute(el)
			const jsonData = JSON.parse(json)

			return async (ctx): Promise<Branch> => {
				const nextCtx = ctx.SetVar(targetAttr, jsonData)
				return filterPass(nextCtx)
			}
		}
	},

	{
		name: "x-yaml",
		filter(el:Element) {
			
			const yamlSrc = utils.requireAttribute(el, "src")
			const yaml = readFileSync(yamlSrc, "utf8")
			const targetAttr = utils.requireTargetAttribute(el)
			const yamlData = YAML.parse(yaml)

			return async (ctx): Promise<Branch> => {
				const nextCtx = ctx.SetVar(targetAttr, yamlData)
				return filterPass(nextCtx)
			}
		}
	},


	{
		name: "x-sql",
		filter(el:Element) {
			const query = utils.requireOneTextChild(el)
			const targetAttr = utils.requireTargetAttribute(el)
			const single = utils.getBoolAttribute(el, "single-row")

			return async (ctx): Promise<Branch> => {
				const nextCtx = await ctx.AddSQLDatasource(query, targetAttr, single)
				return filterPass(nextCtx)
			}
		},

		actionPreceeds(el:Element) {
			const query = utils.requireOneTextChild(el)
			const targetAttr = utils.requireTargetAttribute(el)
			const single = utils.getBoolAttribute(el, "single-row")

			return (ctx) => {
				return ctx.AddSQLDatasource(query, targetAttr, single)
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
		},

		actionPreceeds(el:Element) {
			const body = utils.requireOneTextChild(el)
			const targetAttr = utils.requireTargetAttribute(el)
			const idAttr = utils.getAttribute(el, "id")

			const nodeBody = NodeFunction(body, idAttr)
			
			return async (ctx) => {
				const resp = await nodeBody(ctx)

				// Set output to target
				return ctx.SetVar(targetAttr, resp)
			}
		},
	},

	{
		name: "x-setcookie-action",
		filter: stripFilter,
		action(el:Element) {
			const name = utils.requireAttribute(el, "name")
			const value = utils.requireAttribute(el, "value")

			return async (ctx) => ctx.SetCookie(name, value)
			
		},
	},

	{
		name: "x-sql-action",
		filter: stripFilter,

		action: (formAction) => {
			const query = utils.requireOneTextChild(formAction)
			const target = utils.getAttribute(formAction, "target")
			const single = utils.getBoolAttribute(formAction, "single-row")
			return async (ctx:FilterContext) => {
				const results = await ctx.RunSQL(query)
				const output = single ? results[0] : results
				return target ? ctx.SetVar(target, output) : ctx
			}
		},
	},


	{
		name:"x-nodejs-action",
		filter: stripFilter,
		action: (formAction) => {
			const query = utils.requireOneTextChild(formAction)
			const target = utils.getAttribute(formAction, "target")
			const idAttr = utils.getAttribute(formAction, "id")
			const nodeFunc = NodeFunction(query, idAttr)
			return async (ctx:FilterContext) => {
				const output = await nodeFunc(ctx)
				return target ? ctx.SetVar(target, output) : ctx
			}
		}
	}
]

function pathToRegex(path:string): RegExp {
	path = "^"+ path.replace(/:[\w]+/g, '[\\w,-]+') +"$"
	return new RegExp(path)
}



type ChainPair = {
	tag: Tag
	link: ElementChain

	mutateCtx: (ctx:FilterContext) => Promise<FilterContext>
	accessCtx: (ctx:FilterContext) => FormResult
}

const noMutation = async (ctx:FilterContext) => ctx
const alwaysPass = (ctx:FilterContext) => ({ ctx, found:true })

export
function prepareChain(chainLinks:ElementChain[]) {
	const chainTags:ChainPair[] = []

	for (const link of chainLinks) {
		const el = link.element
		const tag = findTagIfX(el)

		if (tag) {
			const mutateCtx = tag.actionPreceeds ? tag.actionPreceeds(el) : noMutation
			const accessCtx = tag.actionContains ? tag.actionContains(el) : alwaysPass

			chainTags.push({ tag, link, mutateCtx, accessCtx })
		}
	}

	return async (ctx:FilterContext): Promise<FormResult> => {
		for (const chain of chainTags) {
			const {link} = chain
			if (link.contains) {
				const access = chain.accessCtx(ctx)
				if (access.found) {
					ctx = access.ctx
				} else {
					return {ctx, found:false}
				}
			} else {
				ctx = await chain.mutateCtx(ctx)
			}
		}

		return { ctx, found:true }
	}
}

export
function findTag(el:Element): Tag|undefined {
	return tags.find((t) => t.name === el.name)
}

export
function findTagIfX(el:Element): Tag|undefined {
	const tag = findTag(el)
	if ((!tag) && el.name?.startsWith("x-")) {
		throw Error(`Unknown x- tag ${el.name}`)
	}
	return tag
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
	"content-type",
	"path",
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
