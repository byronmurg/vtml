import VtmlDocument from "../src/document"


test("form basic", async () => {

	const exampleHTML = `
		<form method="POST" v-name="foo" >
			<input name="bar" type="text" required />
		</form>
	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const schema = doc.oapiSchema

	expect(schema.info.version).toBe(`1.0`)
})
