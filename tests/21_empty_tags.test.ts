import VtmlDocument from "../src/document"
import {InitCtx} from "./test_lib"

// Just an example context
const ctx = InitCtx()

function trimAll(str:string): string {
	return str.split("\n").map((s) => s.trim()).join("")
}

test("<v-pass>", async () => {
	const exampleHTML = `
		<v-pass>
			<v-json target="foo" >22</v-json>
			<p>in:$foo</p>
		</v-pass>
		<p>out:$foo</p>
	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const fooOut = await doc.renderLoaderMl(ctx)
	expect(trimAll(fooOut)).toBe(`<p>in:22</p><p>out:</p>`)
})

test("<v-pass> empty with extra text", async () => {
	const exampleHTML = `
		<v-pass> yo
			<v-json target="foo" >22</v-json>
			<p>in:$foo</p>
		sup </v-pass>
		<p>out:$foo</p>
	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const fooOut = await doc.renderLoaderMl(ctx)
	expect(trimAll(fooOut)).toBe(`yo<p>in:22</p>sup <p>out:</p>`)
})

test("<v-pass> empty with no ps", async () => {
	const exampleHTML = `
		<v-pass>
			<v-json target="foo" >22</v-json>
		</v-pass>
		out:$foo
	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const fooOut = await doc.renderLoaderMl(ctx)
	expect(trimAll(fooOut)).toBe(`out:`)
})
