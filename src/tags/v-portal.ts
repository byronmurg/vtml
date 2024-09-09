import CreatePassthroughTag from "./passthrough"

export
const VPortal = CreatePassthroughTag({
	name: "v-portal",
	attributes: {
		"v-name": { required:true, special:true },
	},
})
