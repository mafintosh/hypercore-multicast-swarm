const cast = require('./cast')
const messages = require('./messages')
const events = require('events')
const util = require('util')

module.exports = Swarm

function Swarm (feed, opts) {
  if (!(this instanceof Swarm)) return new Swarm(feed, opts)
  events.EventEmitter.call(this)

  const self = this

  this.feed = feed
  this.cast = null

  feed.ready(function (err) {
    if (err) return self.emit('error', err)

    self.cast = cast(feed.key, opts)
    self.cast.on('message', self._onmessage.bind(self))
    self.cast.on('bind', self.emit.bind(self, 'bind'))
    self.cast.on('close', self.emit.bind(self, 'close'))

    self.emit('ready')
  })
}

util.inherits(Swarm, events.EventEmitter)

Swarm.prototype.close = function () {
  if (!this.cast) this.once('ready', this.close)
  else this.cast.close()
}

Swarm.prototype._onmessage = function (buf) {
  const msg = decodeMessage(buf)
  if (!msg) return
  if (this.feed.bitfield && this.feed.has(msg.seq)) return

  const self = this

  // TODO: make feed.put support valueEncoding
  this.feed._putBuffer(msg.seq, msg.data, msg, null, function (err) {
    if (err) self.emit('bad-message', msg)
  })
}

Swarm.prototype.multicast = function (seq, cb) {
  if (!cb) cb = noop
  const self = this
  this.feed.get(seq, {valueEncoding: 'binary'}, function (err, data) {
    if (err) return cb(err)
    self.feed.proof(seq, function (err, proof) {
      if (err) return cb(err)

      const buf = messages.Message.encode({
        nodes: proof.nodes,
        signature: proof.signature,
        seq,
        data
      })

      // always set here, as .get runs after feed.ready
      self.cast.multicast(buf, cb)
    })
  })
}

function noop () {}

function decodeMessage (buf) {
  try {
    return messages.Message.decode(buf)
  } catch (err) {
    return null
  }
}
