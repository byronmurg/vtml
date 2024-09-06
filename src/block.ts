import * as HTML from "./html"
import {Branch, ChainResult} from "./types"
import FilterContext from "./filter_context"
import DefaultError, {ServerError} from "./default_errors"
import {uniq, pullAll} from "lodash"
import doesLogicSelectorMatch from "./logic"
import * as Vars from "./variables"
import Debug from "debug"
import BlockCollection from "./block_collection"
import {printRenderDescription, RenderDescription} from "./description"
import NodeFunction from "./node"

type AttributeOptions = {
	required?: boolean  // The attr is required
	special?: boolean   // The attr should not be templated
	strip?: boolean     // Strip the attr from the result element

	inject?: boolean    // Specifies a variable for it's children
	target?: boolean    // Specifies a target
	source?: boolean    // Should be source format and not templated
}

const attrOps = {
	pass: { special:true },
	strip: { strip:true },
	source: { special:true, source:true },
}

type AttributeSpec = Record<string, AttributeOptions>

const defaultAttributeSpec: AttributeSpec = {
	// @TODO half of these aren't needed
	"required":attrOps.pass,
	"name":attrOps.pass,
	"type":attrOps.pass,
	"method":attrOps.pass,
	"maxlength":attrOps.pass,
	"minlength":attrOps.pass,
	"max":attrOps.pass,
	"min":attrOps.pass,
	"pattern":attrOps.pass,
	"content-type":attrOps.pass,
	"path":attrOps.pass,
}


export
type BlockReport = {
	id: string

	provides: string[]
	consumes: string[]
	injects: string[]

	doesConsumeError: boolean
}


type TagCommon = {
	name: string
	attributes: AttributeSpec
}

type VtmlTag = TagCommon & {

	consumesError?: boolean

	prepare: (block:VtmlBlock) => {
		contains: (ctx:FilterContext) => Promise<ChainResult>
		preceeds: (ctx:FilterContext) => Promise<FilterContext>
		render: (ctx:FilterContext) => Promise<Branch>
	}
}





const tags:VtmlTag[] = [
	CreateLoaderTag({
		name: "v-json",

		attributes: {
			"src": attrOps.pass,
			"target": { target:true, required:true },
		},

		prepareChain(block) {
			const json = block.bodyOrSrc()
			const targetAttr = block.targetAttr()
			const jsonData = JSON.parse(json)

			return async (ctx) => ctx.SetVar(targetAttr, jsonData)
		}
	}),

	CreateLoaderTag({
		name: "v-nodejs",

		attributes: {
			"target": { target:true },
		},

		prepareChain(block) {
			const body = block.requireOneTextChild()
			const targetAttr = block.targetAttr()
			const fnc = NodeFunction(body, block.getName())

			return async (ctx) => {
				try {
					const output = await fnc(ctx)
					return ctx.SetVar(targetAttr, output)
				} catch (e) {
					const message = (e instanceof Error)? e.message : ServerError
					return ctx.SetError(500, message)
				}
			}
		}
	}),

	{
		name: "v-action",
		attributes: {},
		prepare: (branch) => {
			return {
				preceeds: (ctx) => Promise.resolve(ctx),
				contains: (ctx) => {
					// Technically shouldn't be found inside a
					// contains. But still...
					const found = ctx.rootDataset._inAction
					return Promise.resolve({ ctx, found })
				},

				async render(ctx:FilterContext) {
					if (ctx.rootDataset._inAction) {
						// @TODO should this be calling some
						// action version that renders in sequence?
						return branch.renderChildren(ctx)
					} else {
						return ctx.filterPass()
					}
				}
			}	
		},
	},


	{
		name: "v-for-each",
		attributes: {
			source: { required:true, source:true },
			as: { required:true, inject:true },
		},
		prepare: (branch) => {

			const source = branch.sourceAttr()
			const asAttr = branch.attr("as")

			return {
				preceeds: (ctx) => Promise.resolve(ctx),
				// Always found!!!
				contains: (ctx) => Promise.resolve({ ctx, found:true }),

				async render(ctx) {
					
					const ctxs = ctx.Select(source).SplitAs(asAttr)

					const childBranches = await Promise.all(ctxs.map((s) => branch.renderChildren(s)))
					const elements = childBranches.flatMap((child) => child.elements)
					return { ctx, elements }
				}
			}
		},
	},


	CreateLogicTag({
		name: "v-if",
		attributes: {
			"source": { required:true, source:true },
			"eq": {},

			"lt": {},
			"lte": {},
			"gt": {},
			"gte": {},
		},

		prepareLogic(block) {
			const source = block.sourceAttr()
			return async (ctx) => {
				const value = ctx.getKey(source)
				const attributes = block.templateAttributes(ctx)
				return doesLogicSelectorMatch(value, attributes)
			}
		}
	}),

	CreateCheckTag({
		name: "v-check-found",
		code: 404,
	}),
]


type LogicTag = TagCommon & {
	prepareLogic: (block:VtmlBlock) => (ctx:FilterContext) => Promise<boolean>
}

function CreateLogicTag(tag:LogicTag): VtmlTag {
	const debug = Debug("vtml:tag:"+tag.name)

	return {
		name: tag.name,
		attributes: tag.attributes,

		prepare(block) {
			const check = tag.prepareLogic(block)

			return {
				preceeds: (ctx) => Promise.resolve(ctx),
				contains: async (ctx) => {
					const match = await check(ctx)
					return { found:match, ctx }
					
				},
				render: async (ctx) => {
					const match = await check(ctx)
					if (match) {
						debug("match")
						return block.renderChildren(ctx)
					} else {
						debug("pass")
						return ctx.filterPass()
					}
				}
			}
		},

	}
}




type LoaderTag = TagCommon & {
	prepareChain: (block:VtmlBlock) => (ctx:FilterContext) => Promise<FilterContext>
}

function CreateLoaderTag(tag:LoaderTag): VtmlTag {
	return {
		name: tag.name,
		attributes: tag.attributes,

		prepare(block) {
			const chain = tag.prepareChain(block)

			return {
				preceeds: chain,

				// Loaders never contain anything
				contains: (ctx) => Promise.resolve({ found:false, ctx }),

				render: async (ctx) => {
					const newCtx = await chain(ctx)
					return newCtx.filterPass()
				}
			}
		}
	}
}




type CheckTag = {
	name: string
	code: number
}

function CreateCheckTag(tag:CheckTag): VtmlTag {
	return CreateLogicTag({
		name: tag.name,
		attributes: {
			"source": { required:true, source:true },
			"message": {},
			"eq": {},

			"lt": {},
			"lte": {},
			"gt": {},
			"gte": {},
		},

		prepareLogic(block) {
			const source = block.sourceAttr()
			const messageTmpl = block.attr("message")

			const check = (ctx:FilterContext) => {
				const attributes = block.templateAttributes(ctx)
				const value = ctx.getKey(source)
				return doesLogicSelectorMatch(value, attributes)
			}

			return async (ctx:FilterContext) => {
				const result = check(ctx)
				if (! result) {
					const message = ctx.templateStringSafe(messageTmpl) || DefaultError(tag.code)
					ctx.SetError(tag.code, message)
				}

				return result
			}
		},

	})
}








function findTag(el:HTML.TagElement) {
	return tags.find((tag) => tag.name === el.name)
}

function findTagIfV(el:HTML.TagElement) {
	const tag = findTag(el)
	if (el.name.startsWith("v-") && !tag) {
		throw Error(`Unknown VTML tag ${el.name}`)
	}
	return tag
}









type IsolateReponse = ChainResult & Branch










export
interface Block {
	Find(check:(el:HTML.TagElement) => boolean): Block|undefined


	Render(ctx:FilterContext): Promise<Branch>


	CheckContains(ctx:FilterContext): Promise<ChainResult>
	CheckPreceeds(ctx:FilterContext): Promise<FilterContext>

	getAllConsumes(): string[]
	resolveChildConsumes(seq:number, consumes:string[]): string[]

	Isolate(): (ctx:FilterContext) => Promise<IsolateReponse>

	createChildChain(seq:number, consumes:string[]): (ctx:FilterContext) => Promise<ChainResult>

	getRenderDescription(): RenderDescription[]

	getName(): string
	getPath(): string[]

	// Create a variable report
	report(): BlockReport

	// Check all variables are provided
	checkConsumers(input:string[]): void
}



function templateAttributesSpec(ctx:FilterContext, attrs:HTML.TagElement["attributes"], spec:AttributeSpec) {
	const cpy:HTML.TagElement["attributes"] = {}

	for (const k in attrs) {
		const v = attrs[k]
		const type = spec[k]
		// If it's a special or target/source attr
		if (type.strip || type.target || type.source || type.inject) {
			continue
		} else if (type.special) {
			// Special attributes are not templated
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


class VtmlBlock implements Block {

	_prepared: ReturnType<VtmlTag["prepare"]>
	public children: BlockCollection
	debug: Debug.Debugger

	constructor(public readonly tag:VtmlTag, private el:HTML.TagElement, private seq:number, private parent:Block) {
		this.debug = Debug("vtml:block:"+el.name)
		this.children = BlockCollection.Create(el.elements, this)
		this.checkAttributes()
		this._prepared = tag.prepare(this)
	}

	getName() {
		return this.el.name
	}

	getRenderDescription(): RenderDescription[] {
		return this.children.getRenderDescription()
	}

	checkConsumers(inputs:string[]) {
		const localReport = this.getLocalReport()
		for (const consume of localReport.consumes) {
			if (!inputs.includes(consume)) {
				this.error(`${consume} not defined`)
			}
		}

		const childInputs = inputs.concat(localReport.injects)
		this.children.checkAllConsumer(childInputs)
	}

	report(): BlockReport {
		const localReport = this.getLocalReport()
		const childReport = this.children.aggReport()

		const consumes = localReport.consumes.concat(
			pullAll(childReport.consumes, localReport.injects)
		)

		const doesConsumeError = childReport.doesConsumeError || localReport.doesConsumeError

		return {
			id: `${this.el.name}(${this.seq})`,
			provides: localReport.provides,
			consumes: uniq(consumes),
			injects: localReport.injects,
			doesConsumeError,
		}
	}

	getLocalReport(): BlockReport {
		const attrConsumes: string[] = []
		const attrProvides: string[] = []
		const attrInjects: string[] = []

		for (const k in this.tag.attributes) {
			const value = this.el.attributes[k]

			if (!value) continue

			const vars = Vars.getVarsInString(value.toString())

			if (!vars.length) continue

			const type = this.tag.attributes[k]
			if (type.special) continue

			if (type.target) {
				attrProvides.push(...vars)
			} else if (type.inject) {
				attrInjects.push(...vars)
			} else {
				attrConsumes.push(...vars)
			}
		}

		return {
			id: `${this.el.name}(${this.seq})`,
			provides: uniq(attrProvides),
			consumes: uniq(attrConsumes),
			injects: uniq(attrInjects),
			doesConsumeError: this.tag.consumesError || false,
		}

	}
		

	Find(check:(el:HTML.TagElement) => boolean): Block|undefined {
		if (check(this.el)) {
			return this
		} else {
			return this.children.findInChildren(check)
		}
	}

	renderChildren(ctx:FilterContext) {
		return this.children.renderAll(ctx)
	}

	getPath() {
		const ancestorPath = this.parent.getPath()
		return ancestorPath.concat(`${this.el.name}(${this.seq})`)
	}

	getPathString() {
		return this.getPath().join("->")
	}

	error(message:string): never {
		const path = this.getPathString()
		const filename = this.el.filename
		throw Error(`${message} in ${filename}:${path}`)
	}

	checkAttributes() {
		this.debug("check attributes")

		for (const k in this.tag.attributes) {
			const type = this.tag.attributes[k]
			const value = this.el.attributes[k]

			if (!value) {
				if (type.required) {
					this.error(`Missing required attribute ${k}`)
				}
			} else {
				const vars = Vars.getTemplatesInString(value.toString())

				if (type.source && vars.length !== 1) {
					this.error(`Source attributes must select just one variable`)
				}

				if (type.special && vars.length > 0) {
					this.error(`Attribute ${k} cannot be templated`)
				}

				if (type.target) {
					const [v] = vars
					if (!v) {
						this.error(`Target attribute must set one variable`)
					}

					// If extra characters were found
					if (v !== value) {
						this.error(`Malformed target attribute`)
					}
				}
			}
		}

		for (const k in this.el.attributes) {
			const type = this.tag.attributes[k]

			if (! type) {
				this.error(`Unknown attribute ${k}`)
			}
		}
	}


	templateAttributes(ctx:FilterContext) {
		return templateAttributesSpec(
			ctx,
			this.el.attributes,
			this.tag.attributes,
		)
	}

	attr(name:string): string {
		return (this.el.attributes[name] || "").toString()
	}

	targetAttr() {
		return this.attr("target")
	}

	sourceAttr() {
		return this.attr("source")
	}

	requireOneTextChild(): string {
		const children = this.el.elements
		const textEl = children[0]
		if ((children.length !== 1) || (textEl?.type !== "text")) {
			this.error(`must have exactly one text element`)
		}

		return (textEl.text || "").toString().trim()
	}

	bodyOrSrc() {
		return this.requireOneTextChild() // @TODO or src
	}

	async Render(ctx:FilterContext): Promise<Branch> {
		this.debug("render")
		return this._prepared.render(ctx)
	}

	CheckContains(ctx:FilterContext): Promise<ChainResult> {
		return this._prepared.contains(ctx)
	}

	CheckPreceeds(ctx:FilterContext): Promise<FilterContext> {
		return this._prepared.preceeds(ctx)
	}

	getAllConsumes() {
		const report = this.report()
		return uniq(this.parent.resolveChildConsumes(this.seq, report.consumes))
	}

	resolveChildConsumes(seq:number, consumes:string[]) {
		const preceedingConsumes = this.children.getAllConsumesForChild(seq, consumes)
		const localReport = this.getLocalReport()

		const allConsumes = localReport.consumes.concat(preceedingConsumes)
		return this.parent.resolveChildConsumes(this.seq, allConsumes)
	}


	Isolate() {
		this.debug("isolate")
		const report = this.report()
		const parentChain = this.parent.createChildChain(this.seq, report.consumes)

		return async (ctx:FilterContext): Promise<IsolateReponse> => {
			const parentResult = await parentChain(ctx)
			if (!parentResult.found) {
				return { found:false, elements:[], ctx:parentResult.ctx }
			}

			const renderOutput = await this.Render(parentResult.ctx)
			return { found: true, ctx:renderOutput.ctx, elements:renderOutput.elements }
		}
	}

	createChildChain(seq:number, consumes:string[]) {
		const localReport = this.getLocalReport()

		const preceedChain = this.children.createContainerChain(seq, consumes)

		const blockConsumes = consumes.concat(localReport.consumes).concat(preceedChain.consumes)
		const parentChain = this.parent.createChildChain(this.seq, blockConsumes)

		return async (ctx:FilterContext): Promise<ChainResult> => {
			const parentRes = await parentChain(ctx)
			if (!parentRes.found) {
				return parentRes
			}

			const preceedRes = await preceedChain.collection.runPreceed(parentRes.ctx)

			return await this.CheckContains(preceedRes)
		}
	}
}




class TextBlock implements Block {
	constructor(private el:HTML.TextElement, private seq:number, private parent:Block) {}

	getName() {
		return "#text"
	}

	async Render(ctx:FilterContext): Promise<Branch> {
		const text = ctx.templateStringSafe(this.el.text)
		const resp:HTML.Element = {
			...this.el,
			text,
		}
		return { ctx, elements:[resp] }
	}

	checkConsumers(inputs:string[]) {
		const consumes = Vars.getVarsInString(this.el.text)
		for (const consume of consumes) {
			if (!inputs.includes(consume)) {
				this.error(`${consume} not defined`)
			}
		}
	}

	report(): BlockReport {
		return {
			id: `#text(${this.seq})`,
			provides: [],
			injects: [],
			consumes: Vars.getVarsInString(this.el.text),
			doesConsumeError: false,
		}
	}

	Find() {
		// Will never find inside a text block
		return undefined
	}

	getPath() {
		const ancestorPath = this.parent.getPath()
		return ancestorPath.concat(`#text(${this.seq})`)
	}

	getPathString() {
		return this.getPath().join("->")
	}

	error(message:string): never {
		const path = this.getPathString()
		const filename = this.el.filename
		throw Error(`${message} in ${filename}:${path}`)
	}

	CheckContains(): Promise<ChainResult> {
		this.error(`CheckContains called on TextBlock`)
	}

	CheckPreceeds(ctx:FilterContext): Promise<FilterContext> {
		// Always just pass ctx
		return Promise.resolve(ctx)
	}

	getRenderDescription() {
		return []
	}

	getAllConsumes() {
		const consumes = Vars.getVarsInString(this.el.text)
		return this.parent.resolveChildConsumes(this.seq, consumes)
	}

	resolveChildConsumes(seq:number, consumes:string[]) {
		// @NOTE Dummy, can't have children
		return this.parent.resolveChildConsumes(seq, consumes)
	}

	// @NOTE Can never contain children
	// eslint-disable-next-line
	createChildChain(seq:number, consumes:string[]): (ctx:FilterContext) => Promise<ChainResult> {
		throw Error(`createChildChain called in TextBlock`)
	}

	Isolate() {
		const report = this.report()

		const parentChain = this.parent.createChildChain(this.seq, report.consumes)

		return async (ctx:FilterContext): Promise<IsolateReponse> => {
			const parentResult = await parentChain(ctx)
			if (!parentResult.found) {
				return { found:false, elements:[], ctx:parentResult.ctx }
			}

			const renderOutput = await this.Render(parentResult.ctx)
			return { found: true, ctx:renderOutput.ctx, elements:renderOutput.elements }
		}
	}
}




class InbuiltBlock implements Block {

	public children: BlockCollection
	debug: Debug.Debugger

	constructor(
		public readonly el:HTML.TagElement,
		public readonly seq:number,
		private readonly parent: Block,
	) {
		this.debug = Debug("vtml:block:"+el.name)
		this.children = BlockCollection.Create(el.elements, this)
	}

	getName() {
		return this.el.name
	}

	checkConsumers(inputs:string[]) {
		const consumes = this.getVarsInAttributes()

		for (const consume of consumes) {
			if (!inputs.includes(consume)) {
				this.error(`${consume} not defined`)
			}
		}

		this.children.checkAllConsumer(inputs)
	}


	Find(check:(el:HTML.TagElement) => boolean): Block|undefined {
		if (check(this.el)) {
			return this
		} else {
			return this.children.findInChildren(check)
		}
	}

	report(): BlockReport {
		const childReport = this.children.aggReport()
		const consumeVars = this.getVarsInAttributes()
		const id = `${this.el.name}(${this.seq})`

		return {
			...childReport,
			id,
			consumes: childReport.consumes.concat(consumeVars)
		}
	}

	getVarsInAttributes() {
		let vars:string[] = []

		for (const k in this.el.attributes) {
			const v = this.el.attributes[k]

			if (typeof(v) === "string") {
				const attrVars = Vars.getVarsInString(v)

				vars = vars.concat(attrVars)
			}
		}

		return vars
	}

	async Render(ctx:FilterContext): Promise<Branch> {
		const {elements} = await this.renderChildren(ctx)
		const attributes = templateAttributesSpec(ctx, this.el.attributes, defaultAttributeSpec)

		const resp = {
			...this.el,
			attributes,
			elements,
		}

		return { ctx, elements:[resp] }
	}


	renderChildren(ctx:FilterContext) {
		this.debug("render children")
		return this.children.renderAll(ctx)
	}

	getPath() {
		const ancestorPath = this.parent.getPath()
		return ancestorPath.concat(`${this.el.name}(${this.seq})`)
	}

	getPathString() {
		return this.getPath().join("->")
	}

	error(message:string): never {
		const path = this.getPathString()
		const filename = this.el.filename
		throw Error(`${message} in ${filename}:${path}`)
	}

	CheckContains(ctx:FilterContext) {
		// Inbuilt tags cannot alter the ctx or remove display
		return Promise.resolve({ ctx, found:true })
	}

	CheckPreceeds(ctx:FilterContext) {
		// Inbuilt tags cannot alter the ctx
		return Promise.resolve(ctx)
	}

	getRenderDescription(): RenderDescription[] {
		return this.children.getRenderDescription()
	}

	getAllConsumes() {
		const consumes = this.getVarsInAttributes()
		return uniq(this.parent.resolveChildConsumes(this.seq, consumes))
	}

	resolveChildConsumes(seq:number, consumes:string[]) {
		const preceedingConsumes = this.children.getAllConsumesForChild(seq, consumes)
		const parentConsumes = this.parent.resolveChildConsumes(this.seq, preceedingConsumes)
		return parentConsumes.concat(preceedingConsumes)
	}


	createChildChain(seq:number, consumes:string[]) {
		const preceedChain = this.children.createContainerChain(seq, consumes)
		const blockConsumes = consumes.concat(preceedChain.consumes)
		const parentChain = this.parent.createChildChain(this.seq, blockConsumes)

		return async (ctx:FilterContext): Promise<ChainResult> => {
			const parentRes = await parentChain(ctx)
			if (!parentRes.found) {
				return parentRes
			}

			const preceedRes = await preceedChain.collection.runPreceed(parentRes.ctx)

			return { found:true, ctx:preceedRes }
		}
	}

	Isolate() {
		const report = this.report()

		const parentChain = this.parent.createChildChain(this.seq, report.consumes)

		return async (ctx:FilterContext): Promise<IsolateReponse> => {
			const parentResult = await parentChain(ctx)
			if (!parentResult.found) {
				return { found:false, elements:[], ctx:parentResult.ctx }
			}

			const renderOutput = await this.Render(parentResult.ctx)
			return { found: true, ctx:renderOutput.ctx, elements:renderOutput.elements }
		}
	}
}


export
function MakeBlock(el:HTML.Element, seq:number, parent:Block): Block {
	if (el.type === "text") {
		return new TextBlock(el, seq, parent)
	} else {
		const tag = findTagIfV(el)

		if (tag) {
			return new VtmlBlock(tag, el, seq, parent)
		} else {
			return new InbuiltBlock(el, seq, parent)
		}
	}
}


class RootBlock implements Block {

	public children: BlockCollection

	constructor(children:HTML.Element[]) {
		this.children = BlockCollection.Create(children, this)
		this.checkConsumers()
	}

	report(): BlockReport {
		return this.children.aggReport()
	}

	checkConsumers() {
		this.children.checkAllConsumer([])
	}

	Find(check:(el:HTML.TagElement) => boolean): Block|undefined {
		return this.children.findInChildren(check)
	}

	Render(ctx:FilterContext): Promise<Branch> {
		return this.children.renderAll(ctx)
	}

	getName() {
		return "<root>"
	}

	getPath() {
		return []
	}

	CheckContains(ctx:FilterContext) {
		// Root blocks do not alter the ctx or remove display
		return Promise.resolve({ ctx, found:true })
	}


	CheckPreceeds(ctx:FilterContext) {
		// Root blocks do not alter the ctx
		return Promise.resolve(ctx)
	}

	getRenderDescription(): RenderDescription[] {
		return this.children.getRenderDescription()
	}

	getAllConsumes() {
		return []
	}

	resolveChildConsumes(seq:number, consumes:string[]) {
		return this.children.getAllConsumesForChild(seq, consumes)
	}

	Isolate() {
		return async (ctx:FilterContext) => {
			const renderOutput = await this.Render(ctx)
			return { found:true, ...renderOutput }
		}
	}

	createChildChain() {
		return (ctx:FilterContext) => Promise.resolve({ found:true, ctx })
	}
}

export
function MakeRootBlock(elements:HTML.Element[]): RootBlock {
	return new RootBlock(elements)
}


//
// Test
//


const elements = HTML.parse(`
	<div>
		<v-json target="$a" >69</v-json>
		<v-json target="$b" >2</v-json>
		<v-json target="$x" >33</v-json>
		<v-json target="$y" >69</v-json>

		<v-nodejs target="$ab" >return $a + $b</v-nodejs>
		<v-nodejs target="$xy" >return $x + $y</v-nodejs>

		<p>$ab $xy</p>

		<v-json target="$arr" >[1,2,3]</v-json>

		<v-for-each source="$arr" as="$el" >
			<form>

				<p>a = $a</p>
				<v-action>
					<p>in action $ab</p>
					<v-nodejs>
						console.log("I'm an action", $ab)
					</v-nodejs>
				</v-action>
				
			</form>
		</v-for-each>

	</div>
`, "fromText")

const doc = MakeRootBlock(elements)

const byName = (name:string) => (el:HTML.TagElement)=> {
	return name === el.name
}

console.log(
	doc.Find(byName("form"))?.Find(byName("v-action"))?.getAllConsumes(),
	//doc.Find((el) => el.name === "v-check-found")?.getPath(),
)

const testCtx = FilterContext.Init({
	search: "",
	method: "GET",
	query: {},
	params: {},
	cookies: {},
	headers: {},
	path: "/",
	matchedPath: "/",
	_inAction: true,
})

printRenderDescription(
	//doc.Find(byName("form"))?.Find(byName("v-action"))?.Isolate().getRenderDescription() || [],
	doc.getRenderDescription(),
	//doc.Find((el) => el.name === "form")?.getRenderDescription() || []
)


doc.Find(byName("form"))?.Find(byName("v-action"))?.Isolate()(testCtx)
//doc.Render(testCtx)
	.then((b) => ({
		code: b.ctx.GetReturnCode(),
		elements: b.elements
	})
	)
	.then((e) => JSON.stringify(e, null, 2))
	.then(console.log)

