import EventStream from "../event_stream"
import CreateLoaderTag from "./loader"
import type FilterContext from "../filter_context"

export const VNotify = CreateLoaderTag({
	name: "v-notify",
	attributes: {
		channel: { required:true },
		message: {},
	},

	prepareChain: (block) => {
		if (! EventStream.isConnected()) {
			block.error(`v-notify used but no EVENT_STREAM_URL environment variable found`)
		}

		if (block.hasChildren()) {
			block.error(`v-notify cannot have a body`)
		}

		const loader = async (ctx:FilterContext) => {
			const attrs = block.templateAttributes(ctx)
			const channel = attrs['channel']?.toString() ||""
			const message = attrs['message']?.toString() ||""
			block.debug("emit", channel, message)
			EventStream.sendMessage(channel, message)
			return ctx
		}

		return loader
	}
})
