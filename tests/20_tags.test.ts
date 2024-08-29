import VtmlDocument from "../src/document"
import {InitCtx} from "./test_lib"

// Just an example context
const ctx = InitCtx()

function trimAll(str:string): string {
	return str.split("\n").map((s) => s.trim()).join("")
}

test("Unknown tags throw an error", () => {
	const exampleHTML = `<v-dunnome/>`

	const func = () => VtmlDocument.LoadFromString(exampleHTML)

	expect(func).toThrow(`Unknown v- tag in v-dunnome`)
})

test("v-with", async () => {

	const exampleHTML = `
		<v-json target="vars" >
			"Hi there"
		</v-json>

		<v-with source="$vars">
			<p>$</p>
		</v-with>

		<v-with source="$notexist">
			<p>Shouldn't see me</p>
		</v-with>
	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const output = await doc.renderLoaderMl(ctx)

	expect(output).toBe(`<p>Hi there</p>`)
})

test("v-use", async () => {

	const exampleHTML = `
		<v-json target="vars" >
			"Hi there"
		</v-json>

		<v-use source="$vars">
			<p>$</p>
		</v-use>

		<v-use source="$notexist">
			<p>Should still see me</p>
		</v-use>
	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const output = await doc.renderLoaderMl(ctx)

	expect(output).toBe(`<p>Hi there</p><p>Should still see me</p>`)
})

test("v-hint-port", async () => {

	const exampleHTML = `
		<v-hint-port port="1337" />
	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const port = await doc.findHint("v-hint-port", "port")

	expect(port).toBe(`1337`)
})

test("v-if", async () => {

	async function testIf(tag:string) {
		const exampleHTML = `
			<v-json target="var" >
				22
			</v-json>

			${tag}
		`

		const doc = VtmlDocument.LoadFromString(exampleHTML)

		return trimAll(await doc.renderLoaderMl(ctx))
	}

	const truthyOut = await testIf(`
		<v-if source="$var" >truthy</v-if>
	`)
	expect(truthyOut).toBe(`truthy`)

	const eqOut = await testIf(`
		<v-if source="$var" eq="22" >true</v-if>
	`)

	expect(eqOut).toBe(`true`)

	const gteOut = await testIf(`
		<v-if source="$var" gte="22" >true</v-if>
	`)

	expect(gteOut).toBe(`true`)


	const allOut = await testIf(`
		<v-if source="$var" eq="22" >
			(eq 22)
		</v-if>
		<v-if source="$var" gt="10" >
			(gt 10)
		</v-if>
		<v-if source="$var" lt="100" >
			(lt 100)
		</v-if>
	`)

	expect(allOut).toBe("(eq 22)(gt 10)(lt 100)")

	const everyOut = await testIf(`
		<v-if source="$var" eq="22" gt="10" lt="100" >
			Every selector matches
		</v-if>
	`)

	expect(everyOut).toBe("Every selector matches")

	const oneNotOut = await testIf(`
		<v-if source="$var" eq="22" gt="10" lte="10" >
			One doesn't match
		</v-if>
	`)

	expect(oneNotOut).toBe("")
})


test("v-unless", async () => {

	const exampleHTML = `
		<v-json target="foo" >"bar"</v-json>
		<v-unless source="$foo" eq="bar" >
			Shouldn't see me
		</v-unless>
	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const output = await doc.renderLoaderMl(ctx)

	expect(output).toBe("")
})

test("v-for-each", async () => {

	const exampleHTML = `
		<v-json target="vars" >
			[
				"foo", "bar"
			]
		</v-json>

		<v-for-each source="$vars">
			<p>$</p>
		</v-for-each>
	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const output = await doc.renderLoaderMl(ctx)

	expect(output).toBe(`<p>foo</p><p>bar</p>`)
})

test("v-dump", async () => {
	const exampleHTML = `
		<v-json target="foo" >"bar"</v-json>
		<v-with source="$foo" >
			<v-dump />
		<v-with>
	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const output = await doc.renderLoaderMl(ctx)

	expect(output).toBe(`<pre>"bar"</pre>`)
})

test("v-page", async () => {
	const exampleHTML = `
		<v-page path="/foo" >
			Foo
		</v-page>
		<v-page path="/bar" >
			Bar
		</v-page>
	`

	const fooCtx = InitCtx({
		path: "/foo",
		matchedPath: "/foo",
	})

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const fooOut = await doc.renderLoaderMl(fooCtx)
	expect(trimAll(fooOut)).toBe(`Foo`)
})

test("v-default-page", async () => {
	const exampleHTML = `
		<v-page path="/bar" >
			Bar
		</v-page>
		<v-default-page>
			Foo
		</v-default-page>
	`

	const fooCtx = InitCtx({
		path: "/foo",
		matchedPath: "/foo",
		pageNotFound: true,
	})

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const fooOut = await doc.renderLoaderMl(fooCtx)
	expect(trimAll(fooOut)).toBe(`Foo`)
})

test(`select`, async () => {
	const exampleHTML = `
		<v-json target="foo" >"foo"</v-json>
		<select value="$foo" >
			<option>foo</option>
			<option>bar</option>
		</select>
	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const output = await doc.renderLoaderMl(ctx)

	expect(output).toBe(`<select value="foo"><option selected="yes">foo</option><option>bar</option></select>`)
})

test(`v-return-code`, async () => {
	const exampleHTML = `
		<v-return-code code="403" />
	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const res = await doc.renderDocument(ctx)

	expect(res.status).toBe(403)
})

