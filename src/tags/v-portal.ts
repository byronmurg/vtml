import CreatePassthroughTag from "./passthrough"

export
const VPortal = CreatePassthroughTag({
	name: "v-portal",
	attributes: {
		"path": { required:true, special:true },
	},
})
