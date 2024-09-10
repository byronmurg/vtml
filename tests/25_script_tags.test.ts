import VtmlDocument from "../src/document"
import {InitCtx} from "./test_lib"

// Just an example context
const ctx = InitCtx()

function trimAll(str:string): string {
	return str.split("\n").map((s) => s.trim()).join("")
}

test("script empty as normal", async () => {
	const exampleHTML = `
		<v-json target="$foo" >[1,2,3]</v-json>
		<script src="thing.js" />
	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const fooOut = await doc.renderLoaderMl(ctx)
	expect(trimAll(fooOut)).toBe(`<script src="thing.js"></script>`)
})

test("script basic binding", async () => {
	const exampleHTML = `
		<v-json target="$foo" >22</v-json>
		<script>let f = $foo</script>
	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const fooOut = await doc.renderLoaderMl(ctx)
	expect(trimAll(fooOut)).toBe(`<script>let f = 22</script>`)
})

test("script complex binding", async () => {
	const exampleHTML = `
		<v-json target="$foo" >[1,2,3]</v-json>
		<script>let f = $foo</script>
	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const fooOut = await doc.renderLoaderMl(ctx)
	expect(trimAll(fooOut)).toBe(`<script>let f = [1,2,3]</script>`)
})
