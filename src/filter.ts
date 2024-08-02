import {readFileSync} from "fs"
import pathLib from "path"
import * as utils from "./utils"
import type { Element } from "./html"
import type {Tag, Extractor, ChainResult, FormResult, Cascade, RootFilter, TagFilter, Branch, Filter, ElementChain} from "./types"
import YAML from "yaml"
import FilterContext from "./filter_context"
import doesLogicSelectorMatch from "./logic"
import Debug from "debug"
import NodeFunction from "./node"

const debug = Debug("starling:filter")

const renderExtract: Extractor = (tag:Tag) => tag.render
const actionExtract: Extractor = (tag:Tag) => tag.action || tag.render

function CreateCascade(extractor:Extractor): Cascade {
	const childs = (children:Element[]|undefined): Filter => {
		children = children || []

		const childFilters = children.map((child) => filterNode(child, cascade))

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

	const cascade = {childs, extract:extractor}
	return cascade
}


function textFilter(el:Element): Filter {
	const textAttr = (el.text || "")
	return async (ctx:FilterContext): Promise<Branch> => {
		const text = ctx.templateStringSafe(textAttr.toString())
		const resp:Element = {
			...el,
			text,
		}
		return filterPass(ctx, resp)
	}
}

function filterHTML(el:Element, cascade:Cascade): Filter {
	const childs = cascade.childs(el.elements)

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


function elementFilter(el:Element, cascade:Cascade): Filter {
	const name = el.name || ""

	const tag = findTag(el)

	if (tag) {
		const fnc = cascade.extract(tag)
		return fnc(el, cascade)
	} else {
		// @TODO should be filter default
		// Throw if this is an unknown x- tag
		if (name.startsWith("x-")) {
			throw Error(`Unknown x- tag ${name}`)
		}

		return filterHTML(el, cascade)
	}
}

function filterNode(el:Element, cascade:Cascade): Filter {
	switch (el.type) {
		case "element":
			return elementFilter(el, cascade)
		case "text":
			return textFilter(el)
		default:
			throw Error(`unknown element type ${el.type}`)
	}
}

// @TODO move to utils

function bodyOrSrc(el:Element): string {
	const srcPath = utils.getAttribute(el, "src")
	if (srcPath) {
		return readFileSync(srcPath, "utf8")
	} else {
		return utils.requireOneTextChild(el)
	}
}


// Tag utilities
function filterPass(ctx:FilterContext, ...elements:Element[]): Branch {
	return {elements, ctx}
}

const stripFilter = (el:Element) => async (ctx:FilterContext) => filterPass(ctx)
const justReturnFilter = filterHTML


function prefixIfNotAlready(str:string, prefix:string): string {
	return str.startsWith(prefix)? str : prefix.concat(str)
}

// Form tag is a bit special and needs to be reference directly later
const formTag: Tag = {
	name: "form",
	render(el, cascade) {
		// If it's not a POST I don't care
		if (el.attributes?.method !== "POST") {
			return justReturnFilter(el, cascade)
		} else {
			const xName = utils.requireAttribute(el, 'x-name')
			const xAjax = utils.getBoolAttribute(el, 'x-ajax')
			const childs = cascade.childs(el.elements)

			return async (ctx:FilterContext) => {
				const path = ctx.getKey("$.path")
				const search = ctx.getKey("$.search")
				const searchStr = search ? `?${search}` : ""

				// Don't need extra slash if path is empty
				const fullPath = path.endsWith(xName) ? path : pathLib.posix.join(path, xName)
				const pathSuffix = `${fullPath}${searchStr}`

				const actionPath = prefixIfNotAlready(pathSuffix, "/action")
				const ajaxPath = prefixIfNotAlready(pathSuffix, "/ajax")

				ctx = ctx.SetVar('__form_action', actionPath)
					.SetVar('__form_ajax', ajaxPath)

				const outputAttributes = templateAttributes(el.attributes, ctx)

				if (xAjax) {
					delete outputAttributes.method
				} else {
					outputAttributes.action ||= actionPath
				}

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
}


const tags: Tag[] = [
	formTag, // Include form tag

	{
		name: "x-with",
		render(el, cascade) {
			const source = utils.getSource(el)
			const content = cascade.childs(el.elements)
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
		render(el, cascade) {
			const source = utils.requireSourceAttribute(el)
			const content = cascade.childs(el.elements)
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
		render: stripFilter,
	},

	{
		name: "x-if",
		render(el, cascade) {
			
			const attributes = utils.getAllAttributes(el)
			const source = utils.getSource(el)
			const childs = cascade.childs(el.elements)

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
		render(el, cascade) {
			
			const attributes = utils.getAllAttributes(el)
			const source = utils.getSource(el)
			const childs = cascade.childs(el.elements)

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
		render(el, cascade) {
			
			const source = utils.getSource(el)
			const childs = cascade.childs(el.elements)

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
		render(el) {
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
		render(el, cascade) {
			const path = utils.requireAttribute(el, "path")
			const pathRegex = pathToRegex(path)
			const childs = cascade.childs(el.elements)

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
		render: stripFilter,
	},

	{
		name: "x-default-page",
		render(el, cascade) {
			const childs = cascade.childs(el.elements)
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
		render(el, cascade) {
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
				return filterHTML(el, cascade)
			}
		}
	},


	{
		name: "select",
		render(el, cascade) {
			const childs = cascade.childs(el.elements)

			return async (ctx): Promise<Branch> => {

				const attrs = templateAttributes(el.attributes, ctx)
				const children = await childs(ctx)	
				//@TODO options don't have to be direct children
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
		render(el:Element) {
			
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
		render(el:Element) {
			
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
		render(el:Element) {
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
		render(el:Element) {
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
		render: stripFilter,
		action(el:Element) {
			const name = utils.requireAttribute(el, "name")
			const value = utils.requireAttribute(el, "value")

			return async (ctx) => {
				ctx = ctx.SetCookie(name, value)
				return filterPass(ctx)
			}
			
		},
	},

	{
		name: "x-sql-action",
		render: stripFilter,

		action: (formAction) => {
			const query = utils.requireOneTextChild(formAction)
			const target = utils.getAttribute(formAction, "target")
			const single = utils.getBoolAttribute(formAction, "single-row")
			return async (ctx:FilterContext) => {
				const results = await ctx.RunSQL(query)
				const output = single ? results[0] : results
				ctx = target ? ctx.SetVar(target, output) : ctx
				return filterPass(ctx)
			}
		},
	},


	{
		name:"x-nodejs-action",
		render: stripFilter,
		action: (formAction) => {
			const query = utils.requireOneTextChild(formAction)
			const target = utils.getAttribute(formAction, "target")
			const idAttr = utils.getAttribute(formAction, "id")
			const nodeFunc = NodeFunction(query, idAttr)
			return async (ctx:FilterContext) => {
				const output = await nodeFunc(ctx)
				ctx = target ? ctx.SetVar(target, output) : ctx
				return filterPass(ctx)
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
	accessCtx: (ctx:FilterContext) => ChainResult
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

	return async (ctx:FilterContext): Promise<ChainResult> => {
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

// Attributes that are stripped out
const protectedAttributes = [
	"x-name",
	"x-ajax",
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
			cpy[k] = ctx.templateStringSafe(v)
		} else {
			cpy[k] = v
		}
	}

	return cpy
}

function CreateRootFilter(els:Element[], extractor:Extractor): RootFilter {
	const cascade = CreateCascade(extractor)
	const childs = cascade.childs(els)

	return async (ctx:FilterContext) => {
		const children = await childs(ctx)
		return children.elements
	}
}

export default
function rootFilter(els:Element[]): RootFilter {
	return CreateRootFilter(els, renderExtract)
}

export
function createFormFilter(el:Element): Filter {
	const cascade = CreateCascade(actionExtract)
	return formTag.render(el, cascade)
}
