import CreatePassthroughTag from "./passthrough"

export
const VSubscribe = CreatePassthroughTag({
	name: "v-subscribe",
	attributes: {
		channel: { required:true, special:true }
	},
})
