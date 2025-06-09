import {MakeBlock} from "./index"
import uniq from "lodash/uniq"
import pullAll from "lodash/pullAll"
import intersection from "lodash/intersection"
import type {InitializationResponse, RenderDescription, Branch, Block, TagBlock, BlockReport, ValidationError} from "../types"
import * as HTML from "../html"
import type FilterContext from "../filter_context"
import type {TemplateSet} from "../variables"
import {Ok, ValidateAgg} from "../utils"

type ChainReport = {
	collection: BlockCollection
	consumes: string[]
	globals: string[]
}

type ChildMeta = {
	block: Block
	report: BlockReport
}

type ProvideStep = {
	resolver: Promise<Branch>
	provides: string[]
}

type PreceedStep = {
	resolver: Promise<FilterContext>
	provides: string[]
}

export default
class BlockCollection {

	private description: RenderDescription[]
	private meta: ChildMeta[]

	private constructor(
		private children: Block[],
		private parent: Block
	) {

		this.meta = children.map((block) => ({
			block,
			report: block.report()
		}))

		this.description = this.createDescription(this.meta)
	}

	createDescription(meta:ChildMeta[]): RenderDescription[] {
		return meta.filter(({block}) => block.getName() !== "#text").map(({block, report}) => ({
			name: block.getName(),
			report,
			order: block.getRenderDescription()
		}))
	}

	static Create(children:HTML.Element[], parent:Block, templateSet:TemplateSet): InitializationResponse<BlockCollection> {
		const blockResults = children.map((child, i) => MakeBlock(child, i, parent, templateSet))

		const blockResult = ValidateAgg(...blockResults)

		if (! blockResult.ok) {
			return blockResult
		}

		const blockCollection = new BlockCollection(
			blockResult.result,
			parent
		)
		return Ok(blockCollection)
	}

	async renderInOrder(ctx:FilterContext): Promise<Branch> {
		// Render all children in natural order

		let subCtx = ctx
		const elements: HTML.Element[] = []
		for (const child of this.children) {
			const response = await child.Render(subCtx)
			subCtx = response.ctx
			elements.push(...response.elements)
			
		}
		return { ctx, elements }
	}


	createContainerChain(seq:number, consumes:string[]): ChainReport {
		// We need to build a precedence chain for an element *inside*
		// one of the elements in our chain. The element's containers
		// already have some consumes so we need to take those into account
		//
		// We don't need to worry about the consumes of the element itself
		// as those have been passed to us (or it's an inbuilt).
		
		const next = seq-1
		const chain:Block[] = []
		let globals: string[] = []

		// Loop backwards through the chain
	 	for (let i = next; i >= 0; i--) {
			const child = this.children[i]
			const report = child.report()

			// Does this child provide anything
			// that we need?
			const int = intersection(consumes, report.provides)
			if (int.length) {
				// Then add to the chain
				chain.push(child)
				// And add it's requirements to
				// our own
				consumes = uniq(consumes.concat(report.consumes))

				// Also add it's globals
				globals = uniq(globals.concat(report.globals))
			}
		}

		const newCollection = new BlockCollection(chain.reverse(), this.parent)
		return { consumes, collection:newCollection, globals }
	}



	aggReport(): BlockReport {
		// Create an aggregated report for all blocks
		// in this collection.

		const childrenProvide: string[] = []
		const consumes: string[] = []
		const globals: string[] = []
		let doesConsumeError = false

		for (const child of this.children) {
			const report = child.report()

			// The whole block is considered to consumeError
			// if any one does.
			if (report.doesConsumeError) {
				doesConsumeError = true
			}

			// Add the consumes to the output minus
			// those that are provided by previous elements.
			consumes.push(
				...pullAll(report.consumes, childrenProvide)
			)

			globals.push(...report.globals)


			// Add the provides for this element for the
			// next cycle.
			childrenProvide.push(...report.provides)
		}

		return {
			id: "<block>",
			doesConsumeError,
			consumes,
			globals,
			provides: [],
			injects: [],
		}

	}

	checkAllConsumer(inputs:string[], globals:string[]): InitializationResponse<void> {
		const errors: ValidationError[] = []
		for (const child of this.children) {
			const consumerRes = child.checkConsumers(inputs, globals)
			if (! consumerRes.ok) {
				errors.push(...consumerRes.errors)
			}
			const report = child.report()
			inputs = inputs.concat(report.provides)
		}

		if (errors.length) {
			return {ok:false, errors}
		} else {
			return Ok(undefined)
		}
	}

	async renderAll(ctx:FilterContext) {
		const providedVars: ProvideStep[] = []

		for (const child of this.meta) {
			const {block, report} = child

			const proc = async () => {
				let subCtx = ctx
				for (const provideStep of providedVars) {
					const inter = intersection(report.consumes, provideStep.provides)
					if (inter.length) {
						const {ctx} = await provideStep.resolver
							.catch(() => ({ ctx:subCtx })) // NOTE: Error must be ignored here!!
						subCtx = subCtx.Merge(ctx)
					}
				}

				return block.Render(subCtx)
			}

			providedVars.push({
				provides: report.provides,
				resolver: proc(),
			})
		}

		const allElements: HTML.Element[] = []
		for (const provideStep of providedVars) {
			const {elements} = await provideStep.resolver
			allElements.push(...elements)
		}

		return { ctx, elements:allElements }
	}

	async runPreceed(ctx:FilterContext): Promise<FilterContext> {
		// This works in largely the same way as renderAll
		// but only calls the preceeds
		const providedVars: PreceedStep[] = []

		for (const child of this.meta) {
			const {block, report} = child


			const proc = async () => {
				let subCtx = ctx
				for (const provideStep of providedVars) {
					const inter = intersection(report.consumes, provideStep.provides)
					if (inter.length) {
						const ctx = await provideStep.resolver
							.catch(() => subCtx) // NOTE: Error must be ignored here!!
						subCtx = subCtx.Merge(ctx)
					}
				}

				return block.CheckPreceeds(subCtx)
			}

			providedVars.push({
				provides: report.provides,
				resolver: proc(),
			})
		}

		let retCtx = ctx
		for (const provideStep of providedVars) {
			const ctx = await provideStep.resolver
			retCtx = retCtx.Merge(ctx)
		}

		return retCtx
	}

	findInChildren(check:(el:TagBlock) => boolean): TagBlock|undefined {
		for (const child of this.children) {
			const found = child.Find(check)
			if (found) {
				return found
			}
		}
	}

	findAllInChildren(check:(el:TagBlock) => boolean): TagBlock[] {
		return this.children.flatMap((child) => child.FindAll(check))
	}

	getRenderDescription() {
		return this.description
	}

	anyDynamic(): boolean {
		return this.children.some((child) => child.isDynamic())
	}

	renderAllConstant(): HTML.Element[] {
		return this.children.map((child) => child.RenderConstant())
	}
}

