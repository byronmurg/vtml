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
	matchedPath: string
	params: Record<string, string>
	query: ParsedQs
	method: string
	search?: string
	body?: any
	headers: Record<string, string|string[]|undefined>
	cookies: Record<string, string>
	pageNotFound: boolean
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
type TagFilter = (el:Element, cascade:Cascade) => Filter


/////////////////////
// Chain
/////////////////////

export
type ActionPreceeds = (el:Element) => (ctx:FilterContext) => Promise<FilterContext>

export
type ActionContains = (el:Element) => (ctx:FilterContext) => ChainResult

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
