import TagBlockBase from "./tag_block_base"
import type {Branch, Block, TagBlock, VtmlTag, ChainResult, BlockReport, IsolateReponse} from "../types"
import * as HTML from "../html"
import uniq from "lodash/uniq"
import pullAll from "lodash/pullAll"
import * as Vars from "../variables"
import FilterContext from "../filter_context"
import * as utils from "../utils"
import * as GlobalVars from "../global_variables"

export default
class VtmlBlock extends TagBlockBase implements TagBlock {

	_prepared: ReturnType<VtmlTag["prepare"]>

	constructor(private readonly tag:VtmlTag, el:HTML.TagElement, seq:number, parent:Block) {
		super(el, seq, parent)
		this.checkAttributes()
		this._prepared = this.prepare(tag)
	}

	private prepare(tag:VtmlTag) {
		try {
			return tag.prepare(this)
		} catch (e) {
			this.error(e instanceof Error ? e.message : "unknown error")
		}
	}

	isDynamic() {
		// Always assume dynamic.
		return true
	}

	defaultBehaviour = async (ctx:FilterContext): Promise<Branch> => {
		const {elements} = await this.renderChildren(ctx)
		const attributes = this.templateAttributes(ctx)

		const resp = {
			...this.el,
			attributes,
			elements,
		}

		return { ctx, elements:[resp] }
	}

	checkConsumers(inputs:string[], globals:string[]) {
		const localReport = this.getLocalReport()
		for (const consume of localReport.consumes) {
			if (!inputs.includes(consume)) {
				this.error(`${consume} not defined`)
			}
		}

		for (const provide of localReport.provides) {
			if (inputs.includes(provide)) {
				this.error(`${provide} redefined`)
			}
		}

		for (const glob of localReport.globals) {
			if (!GlobalVars.isValidGlobal(glob)) {
				this.error(`invalid global ${glob}`)
			}

			if (GlobalVars.isProvidedGlobal(glob) && !globals.includes(glob)) {
				this.error(`global ${glob} not found`)
			}
		}

		const childInputs = inputs.concat(localReport.injects)
		const injectGlobals = this._prepared.injectGlobals()
		const childGlobals = globals.concat(injectGlobals)
		this.children.checkAllConsumer(childInputs, childGlobals)
	}

	report(): BlockReport {
		const localReport = this.getLocalReport()
		const childReport = this.children.aggReport()

		const consumes = localReport.consumes.concat(
			pullAll(childReport.consumes, localReport.injects)
		)

		const globals = localReport.globals.concat(childReport.globals)

		const doesConsumeError = childReport.doesConsumeError || localReport.doesConsumeError

		return {
			id: `${this.el.name}(${this.seq})`,
			provides: localReport.provides,
			consumes: uniq(consumes),
			globals: uniq(globals),
			injects: localReport.injects,
			doesConsumeError,
		}
	}

	getLocalReport(): BlockReport {
		const consumes: string[] = []
		const provides: string[] = []
		const injects: string[] = []
		const allGlobals: string[] = []

		for (const k in this.el.attributes) {
			const value = this.el.attributes[k]

			if (!value) continue

			const {locals, globals} = Vars.basicTemplate.findAllVars(value.toString())

			if (!locals.length) continue

			const type = this.tag.attributes[k] || {}
			if (type.special) continue

			if (type.target) {
				provides.push(...locals)
			} else if (type.inject) {
				injects.push(...locals)
			} else {
				consumes.push(...locals)
				allGlobals.push(...globals)
			}
		}

		// In case of error tags like v-catch/v-try we have to add
		// a meta-variable to ensure that the tags are run in the correct order.

		if (this.tag.consumesError) {
			consumes.push(`!thrown_error`)
			injects.push("$error")
		}

		if (this.tag.providesError) {
			provides.push(`!thrown_error`)
		}

		return {
			id: `${this.el.name}(${this.seq})`,
			provides: uniq(provides),
			consumes: uniq(consumes),
			globals: uniq(allGlobals),
			injects: uniq(injects),
			doesConsumeError: this.tag.consumesError || false,
		}

	}

	checkAttributes() {

		for (const k in this.tag.attributes) {
			const type = this.tag.attributes[k]
			const value = this.el.attributes[k]

			if (!value) {
				if (type.required) {
					this.error(`Missing required attribute '${k}'`)
				}
			} else {
				const vars = Vars.basicTemplate.findAllVars(value.toString())

				if (type.source && vars.all.length !== 1) {
					this.error(`Source attributes must select just one variable`)
				}

				if (type.special && vars.all.length > 0) {
					this.error(`Attribute ${k} cannot be templated`)
				}

				if (type.target) {
					const [v] = vars.locals
					if (!v) {
						this.error(`Target attribute must set one variable`)
					}

					// If extra characters were found
					if (v !== value) {
						this.error(`Malformed target attribute`)
					}
				}

				if (type.inject) {
					const [v] = vars.locals
					if (!v) {
						this.error(`As attribute must set one variable`)
					}

					// If extra characters were found
					if (v !== value) {
						this.error(`Malformed as attribute`)
					}
				}
			}
		}

		// If extra attributes are not allowed (most cases) run through the attributes
		// and check that there is a definition for them.
		if (!this.tag.allowExtraAttributes) {
			for (const k in this.el.attributes) {
				const type = this.tag.attributes[k]

				if (! type) {
					this.error(`Unknown attribute ${k}`)
				}
			}
		}
	}


	templateAttributes(ctx:FilterContext) {
		return this.templateAttributesSpec(
			ctx,
			this.el.attributes,
			this.tag.attributes,
		)
	}

	targetAttr() {
		return this.attr("target")
	}

	sourceAttr() {
		return this.attr("source")
	}

	bodyOrSrc() {
		const srcPath = this.attr("src")
		if (srcPath) {
			return utils.readFile(srcPath)
		} else {
			return this.requireOneTextChild()
		}
	}

	async Render(ctx:FilterContext): Promise<Branch> {
		return this._prepared.render(ctx)
	}

	RenderConstant(): HTML.Element {
		throw Error(`RenderConstant called in VtmlBlock`)
	}

	checkContains(ctx:FilterContext): Promise<ChainResult> {
		return this._prepared.contains(ctx)
	}

	CheckPreceeds(ctx:FilterContext): Promise<FilterContext> {
		return this._prepared.preceeds(ctx)
	}

	Isolate() {
		this.debug("isolate")
		const report = this.report()
		const parentChain = this.parent.createChildChain(this.seq, report.consumes)

		const run = async (ctx:FilterContext): Promise<IsolateReponse> => {
			const parentResult = await parentChain.run(ctx)
			if (!parentResult.found) {
				return { found:false, elements:[], ctx:parentResult.ctx }
			}

			const renderOutput = await this.Render(parentResult.ctx)
			return { found: true, ctx:renderOutput.ctx, elements:renderOutput.elements }
		}

		const globals = report.globals.concat(parentChain.globals)

		return { run, globals }
	}

	createChildChainInLoop(seq:number, consumes:string[]) {
		// Loop tags such as v-for-each have a slight exception to then in
		// that they don't need to run when containing an isolate.
		// This is because they cannot match the isolate to a specific instance
		// of the loop so cannot inject the variables.

		// Get all tags before the target tag that provide for it.
		const preceedChain = this.children.createContainerChain(seq, consumes)

		// Collect all consumes of the initial child plus any that were
		// added by the preceeding chain
		const childrenConsume = consumes.concat(preceedChain.consumes)
		
		const parentChain = this.parent.createChildChain(this.seq, childrenConsume)

		const run = async (ctx:FilterContext): Promise<ChainResult> => {
			// Execute parent chain and return if this tag wouldn't be executed.
			const parentRes = await parentChain.run(ctx)
			if (!parentRes.found) {
				return parentRes
			}

			const preceedingCtx = await preceedChain.collection.runPreceed(parentRes.ctx)
			return { found:true, ctx:preceedingCtx }
		}

		const globals = parentChain.globals.concat(preceedChain.globals)

		return { run, globals }
	}

	createChildChain(seq:number, consumes:string[]) {
		this.debug("prepare child chain")

		// If this is a loop we have to do special magic stuff
		if (this.tag.isLoop) {
			return this.createChildChainInLoop(seq, consumes)
		}


		// Get all tags before the target tag that provide for it.
		const preceedChain = this.children.createContainerChain(seq, consumes)

		// Get the chain from my parent with my consumes and the remaining preceeding consumes.
		const localReport = this.getLocalReport()
		const blockConsumes = consumes.concat(localReport.consumes).concat(preceedChain.consumes)
		const parentChain = this.parent.createChildChain(this.seq, blockConsumes)

		const run = async (ctx:FilterContext): Promise<ChainResult> => {
			// Execute parent chain and return if this tag wouldn't be executed.
			const parentRes = await parentChain.run(ctx)
			if (!parentRes.found) {
				return parentRes
			}

			// Now execute myself and return if not found
			const containsRes = await this.checkContains(parentRes.ctx)
			if (! containsRes.found) {
				return containsRes
			}

			// Finally execute all tags before the target
			const preceedRes = await preceedChain.collection.runPreceed(containsRes.ctx)
			return { ctx:preceedRes, found:true }
		}

		const globals = uniq([
			...localReport.globals,
			...preceedChain.globals,
			...parentChain.globals,
		])

		return { run, globals }
	}
}



