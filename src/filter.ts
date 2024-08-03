import type { Element } from "./html"
import type {Tag, Extractor, ChainResult, Cascade, RootFilter, Branch, Filter, ElementChain} from "./types"
import * as TagMap from "./tags"
import FilterContext from "./filter_context"
import {filterPass} from "./tag_utils"
import templateAttributes from "./attributes"

import Debug from "debug"
const debug = Debug("starling:filter")

const tags = Object.values(TagMap)

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

export
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
		debug("process tag", name)
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
	return TagMap.FormTag.render(el, cascade)
}
