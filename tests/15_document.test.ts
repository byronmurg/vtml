import VtmlDocument from "../src/document"

test("title is found", () => {
	const exampleHTML = `
		<title>Hello</title>
	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	expect(doc.title).toBe("Hello")
})

test("pages are found", () => {
	const exampleHTML = `
		<title>Hello</title>
		<v-page path="/foo" ><p>Yo</p></v-page>
		<v-page path="/bar" ><p>Hey</p></v-page>
	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	expect(doc.getPages().length).toBe(2)
})

test("components cannot share paths", () => {
	const exampleHTML = `
		<v-page path="/bar" ><p>Hey</p></v-page>
		<v-expose path="/bar" src="somefile.txt" />
	`

	const fnc = () => VtmlDocument.LoadFromString(exampleHTML)

	expect(fnc).toThrow("Duplicate path in expose /bar")
})
