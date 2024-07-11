import {ParsedQs} from "qs"
import type { Element } from "./html"
import type FilterContext from "./filter_context"

export
type ElementChain = {
	element: Element
	contains?: boolean
}

export
type RootDataset = {
	path: string
	params: Record<string, string>
	query: ParsedQs
	method: string
	body?: any
	headers: Record<string, string|string[]|undefined>
	cookies: Record<string, string>
	pageNotFound: boolean
}

export
type Branch = {
	elements: Element[]
	ctx: FilterContext
}

export
type RootFilter = (ctx:FilterContext) => Promise<Element[]>

export
type Filter = (ctx:FilterContext) => Promise<Branch>

export
type TagFilter = (el:Element) => Filter

export
type Action = (ctx:FilterContext) => Promise<FilterContext>

export
type TagAction = (el:Element) => Action

export
type ActionPreceeds = (el:Element) => (ctx:FilterContext) => Promise<FilterContext>

export
type ActionContains = (el:Element) => (ctx:FilterContext) => FormResult

export
type Tag = {
	name: string
	filter: TagFilter

	action?: TagAction

	actionPreceeds?: ActionPreceeds
	actionContains?: ActionContains
}

export
type FormResult = {
	ctx: FilterContext
	found: boolean
}

export
type Expose = {
	path: string
	contentType?: string
	src: string
}
