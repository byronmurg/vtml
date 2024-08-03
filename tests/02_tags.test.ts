import StarlingDocument from "../src/document"
import FilterContext from "../src/filter_context"

// Just an example context
const ctx = FilterContext.Init({
	path: "/",
	matchedPath: "/",
	query: {},
	method: "GET",
	cookies: {},
	headers: {},
	params:{},
	pageNotFound: false,
})

function trimAll(str:string): string {
	return str.split("\n").map((s) => s.trim()).join("")
}

test("x-with", async () => {

	const exampleHTML = `
		<x-json target="vars" >
			"Hi there"
		</x-json>

		<x-with source="$vars">
			<p>$</p>
		</x-with>

		<x-with source="$notexist">
			<p>Shouldn't see me</p>
		</x-with>
	`

	const doc = StarlingDocument.LoadFromString(exampleHTML)

	const output = await doc.renderLoaderMl(ctx)

	expect(output).toBe(`<p>Hi there</p>`)
})

test("x-use", async () => {

	const exampleHTML = `
		<x-json target="vars" >
			"Hi there"
		</x-json>

		<x-use source="$vars">
			<p>$</p>
		</x-use>

		<x-use source="$notexist">
			<p>Should still see me</p>
		</x-use>
	`

	const doc = StarlingDocument.LoadFromString(exampleHTML)

	const output = await doc.renderLoaderMl(ctx)

	expect(output).toBe(`<p>Hi there</p><p>Should still see me</p>`)
})

test("x-hint-port", async () => {

	const exampleHTML = `
		<x-hint-port port="1337" />
	`

	const doc = StarlingDocument.LoadFromString(exampleHTML)

	const port = await doc.findHint("x-hint-port", "port")

	expect(port).toBe(`1337`)
})

test("x-if", async () => {

	async function testIf(tag:string) {
		const exampleHTML = `
			<x-json target="var" >
				22
			</x-json>

			${tag}
		`

		const doc = StarlingDocument.LoadFromString(exampleHTML)

		return trimAll(await doc.renderLoaderMl(ctx))
	}

	const truthyOut = await testIf(`
		<x-if source="$var" >truthy</x-if>
	`)
	expect(truthyOut).toBe(`truthy`)

	const eqOut = await testIf(`
		<x-if source="$var" eq="22" >true</x-if>
	`)

	expect(eqOut).toBe(`true`)

	const gteOut = await testIf(`
		<x-if source="$var" gte="22" >true</x-if>
	`)

	expect(gteOut).toBe(`true`)


	const allOut = await testIf(`
		<x-if source="$var" eq="22" >
			(eq 22)
		</x-if>
		<x-if source="$var" gt="10" >
			(gt 10)
		</x-if>
		<x-if source="$var" lt="100" >
			(lt 100)
		</x-if>
	`)

	expect(allOut).toBe("(eq 22)(gt 10)(lt 100)")

	const everyOut = await testIf(`
		<x-if source="$var" eq="22" gt="10" lt="100" >
			Every selector matches
		</x-if>
	`)

	expect(everyOut).toBe("Every selector matches")

	const oneNotOut = await testIf(`
		<x-if source="$var" eq="22" gt="10" lte="10" >
			One doesn't match
		</x-if>
	`)

	expect(oneNotOut).toBe("")
})


test("x-unless", async () => {

	const exampleHTML = `
		<x-json target="foo" >"bar"</x-json>
		<x-unless source="$foo" eq="bar" >
			Shouldn't see me
		</x-unless>
	`

	const doc = StarlingDocument.LoadFromString(exampleHTML)

	const output = await doc.renderLoaderMl(ctx)

	expect(output).toBe("")
})

test("x-for-each", async () => {

	const exampleHTML = `
		<x-json target="vars" >
			[
				"foo", "bar"
			]
		</x-json>

		<x-for-each source="$vars">
			<p>$</p>
		</x-for-each>
	`

	const doc = StarlingDocument.LoadFromString(exampleHTML)

	const output = await doc.renderLoaderMl(ctx)

	expect(output).toBe(`<p>foo</p><p>bar</p>`)
})

test("x-dump", async () => {
	const exampleHTML = `
		<x-json target="foo" >"bar"</x-json>
		<x-with source="$foo" >
			<x-dump />
		<x-with>
	`

	const doc = StarlingDocument.LoadFromString(exampleHTML)

	const output = await doc.renderLoaderMl(ctx)

	expect(output).toBe(`<pre>"bar"</pre>`)
})

test("x-page", async () => {
	const exampleHTML = `
		<x-page path="/foo" >
			Foo
		</x-page>
		<x-page path="/bar" >
			Bar
		</x-page>
	`

	const fooCtx = FilterContext.Init({
		path: "/foo",
		matchedPath: "/foo",
		query: {},
		method: "GET",
		cookies: {},
		headers: {},
		params:{},
		pageNotFound: false,
	})

	const doc = StarlingDocument.LoadFromString(exampleHTML)

	const fooOut = await doc.renderLoaderMl(fooCtx)
	expect(trimAll(fooOut)).toBe(`Foo`)
})

test("x-default-page", async () => {
	const exampleHTML = `
		<x-page path="/bar" >
			Bar
		</x-page>
		<x-default-page>
			Foo
		</x-default-page>
	`

	const fooCtx = FilterContext.Init({
		path: "/foo",
		matchedPath: "/foo",
		query: {},
		method: "GET",
		cookies: {},
		headers: {},
		params:{},
		pageNotFound: true,
	})

	const doc = StarlingDocument.LoadFromString(exampleHTML)

	const fooOut = await doc.renderLoaderMl(fooCtx)
	expect(trimAll(fooOut)).toBe(`Foo`)
})

test(`select`, async () => {
	const exampleHTML = `
		<x-json target="foo" >"foo"</x-json>
		<select value="$foo" >
			<option>foo</option>
			<option>bar</option>
		</select>
	`

	const doc = StarlingDocument.LoadFromString(exampleHTML)

	const output = await doc.renderLoaderMl(ctx)

	expect(output).toBe(`<select value="foo"><option selected="yes">foo</option><option>bar</option></select>`)
})
