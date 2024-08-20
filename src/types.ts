import {ParsedQs} from "qs"
import type { TagElement, Element } from "./html"
import type FilterContext from "./filter_context"

export type InputValue = string|string[]|number|boolean

export
type ElementChain = {
	element: TagElement
	contains?: boolean
}

export
type RootDataset = {
	path: string
	matchedPath: string
	params: Record<string, string>
	query: ParsedQs
	method: string
	search?: string
	body?: unknown
	headers: Record<string, string|string[]|undefined>
	cookies: Record<string, string>
	pageNotFound: boolean
	error?: ResponseError
}

/////////////////////
// Tag
/////////////////////

export
type Tag = {
	name: string

	render: TagFilter
	action?: TagFilter

	actionPreceeds?: ActionPreceeds
	actionContains?: ActionContains
}

/////////////////////
// Branch
/////////////////////

export
type Branch = {
	elements: Element[]
	ctx: FilterContext
}


/////////////////////
// Filter
/////////////////////


export
type Extractor = (tag:Tag) => TagFilter

export
type Cascade = {
	childs: (doc:Element[]|undefined) => Filter
	extract: Extractor
}

export
type RootFilter = (ctx:FilterContext) => Promise<Element[]>

export
type Filter = (ctx:FilterContext) => Promise<Branch>

export
type TagFilter = (el:TagElement, cascade:Cascade) => Filter


/////////////////////
// Chain
/////////////////////

export
type ActionPreceeds = (el:TagElement) => (ctx:FilterContext) => Promise<FilterContext>

export
type ActionContains = (el:TagElement) => (ctx:FilterContext) => ChainResult

export
type ChainResult = {
	ctx: FilterContext
	found: boolean
}

export
type FormResult = ChainResult & {
	elements: Element[]
}


export
type Expose = {
	path: string
	contentType?: string
	src: string
}

export
type ResponseError = {
	code: number
	message: string
}

