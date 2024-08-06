import StarlingDocument from "../src/document"
import {InitCtx} from "./test_lib"

// Just an example context
const ctx = InitCtx()

function trimAll(str:string): string {
	return str.split("\n").map((s) => s.trim()).join("")
}

test("<x-pass>", async () => {
	const exampleHTML = `
		<x-pass>
			<x-json target="foo" >22</x-json>
			<p>in:$foo</p>
		</x-pass>
		<p>out:$foo</p>
	`

	const doc = StarlingDocument.LoadFromString(exampleHTML)

	const fooOut = await doc.renderLoaderMl(ctx)
	expect(trimAll(fooOut)).toBe(`<p>in:22</p><p>out:</p>`)
})

test("<x-pass> empty with extra text", async () => {
	const exampleHTML = `
		<x-pass> yo
			<x-json target="foo" >22</x-json>
			<p>in:$foo</p>
		sup </x-pass>
		<p>out:$foo</p>
	`

	const doc = StarlingDocument.LoadFromString(exampleHTML)

	const fooOut = await doc.renderLoaderMl(ctx)
	expect(trimAll(fooOut)).toBe(`yo<p>in:22</p>sup <p>out:</p>`)
})

test("<x-pass> empty with no ps", async () => {
	const exampleHTML = `
		<x-pass>
			<x-json target="foo" >22</x-json>
		</x-pass>
		out:$foo
	`

	const doc = StarlingDocument.LoadFromString(exampleHTML)

	const fooOut = await doc.renderLoaderMl(ctx)
	expect(trimAll(fooOut)).toBe(`out:`)
})
