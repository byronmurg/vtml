import CreatePassthroughTag from "./passthrough"

export
const VHintPort = CreatePassthroughTag({
	name: "v-hint-port",
	attributes: {
		port: { required:true, special:true },
	},
	bodyPolicy: "deny",
})
