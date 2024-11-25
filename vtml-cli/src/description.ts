import type {RenderDescription} from "@vtml/lib/dist/types"

function makeIndentString(indent: number): string {
	return new Array(indent * 2).fill(" ").join("")
}

function printRenderDescriptionRow(
	desc: RenderDescription,
	indent: number = 0
) {
	const indentStr = makeIndentString(indent)

	const report = desc.report
	const parts = [desc.name]

	if (report.provides.length) {
		const provides = desc.report.provides.join(" ")
		parts.push(`\x1b[95m${provides}\x1b[0m`)
	}

	if (report.injects.length) {
		const injects = desc.report.injects.join(" ")
		parts.push(`\x1b[96m${injects}\x1b[0m`)
	}

	if (report.consumes.length) {
		const consumes = desc.report.consumes.join(" ")
		parts.push(`\x1b[94m${consumes}\x1b[0m`)
	}

	console.log(`${indentStr}<${parts.join(" ")}>`)
	printRenderDescription(desc.order, indent + 1)
}

export function printRenderDescription(
	order: RenderDescription[],
	indent: number = 0
) {
	for (const child of order) {
		printRenderDescriptionRow(child, indent)
	}
}
