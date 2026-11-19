// CometD extension for Salesforce's event replay. On every subscribe it sends the replay id
// to resume from, so after a restart or reconnect we get the events we missed:
//   -1 = only new events (first run); a stored id = everything after that event.
export function createReplayExtension(channel, initialReplayId) {
  let replayId = initialReplayId ?? -1

  return {
    get replayId() {
      return replayId
    },
    setReplayId(id) {
      replayId = id
    },
    outgoing(message) {
      if (message.channel === '/meta/subscribe' && message.subscription === channel) {
        message.ext = { ...message.ext, replay: { [channel]: replayId } }
      }
      return message
    },
  }
}
