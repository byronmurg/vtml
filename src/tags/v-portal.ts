import CreatePassthroughTag from "./passthrough"

export
const VPortal = CreatePassthroughTag({
	name: "v-portal",
	hasBody: true,
	attributes: {
		"path": { required:true, special:true },
	},
})
