import {InitDocument, RenderErrors} from "./test_lib"

test("title is found", () => {
	const exampleHTML = `
		<title>Hello</title>
	`

	const doc = InitDocument(exampleHTML)

	expect(doc.title).toBe("Hello")
})

test("pages are found", () => {
	const exampleHTML = `
		<title>Hello</title>
		<v-page path="/foo" ><p>Yo</p></v-page>
		<v-page path="/bar" ><p>Hey</p></v-page>
	`

	const doc = InitDocument(exampleHTML)

	expect(doc.getPages().length).toBe(2)
})

test("components cannot share paths", () => {
	const exampleHTML = `
		<v-page path="/bar" ><p>Hey</p></v-page>
		<v-expose path="/bar" src="somefile.txt" />
	`

	const errors = RenderErrors(exampleHTML)

	expect(errors).toEqual([
		{
			message: "Duplicate path /bar",
			tag: "v-page",
			filename: "<string>",
			linenumber: 2,
		},
		{
			message: "Duplicate path /bar",
			tag: "v-expose",
			filename: "<string>",
			linenumber: 3,
		},
	])
})
