
export
interface EventStreamConnection {
	onMessage(cbk:(msg:string) => void): void
	disconnect(): void
}

export default
interface EventStream {
	isConnected(): boolean
	connectClient(channel:string): EventStreamConnection
	sendMessage(channel:string, message:string): void
}

