const cast = require('./cast')
const messages = require('./messages')
const events = require('events')
const util = require('util')

module.exports = Swarm

function Swarm (feed, opts) {
  if (!(this instanceof Swarm)) return new Swarm(feed, opts)
  events.EventEmitter.call(this)

  this.cast = cast(opts)
  this.cast.on('message', this._onmessage.bind(this))
  this.cast.on('bind', this.emit.bind(this, 'bind'))
  this.cast.on('close', this.emit.bind(this, 'close'))
  this.feed = feed
}

util.inherits(Swarm, events.EventEmitter)

Swarm.prototype.close = function () {
  this.cast.close()
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
