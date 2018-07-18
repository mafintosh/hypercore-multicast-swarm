const cyclist = require('cyclist')
const dgram = require('dgram')
const util = require('util')
const events = require('events')

module.exports = Cast

function Cast (opts) {
  if (!(this instanceof Cast)) return new Cast(opts)
  events.EventEmitter.call(this)

  if (!opts) opts = {}

  const self = this

  this.seq = 0
  this.mtu = opts.mtu || 900
  this.incoming = cyclist(16384)
  this.address = opts.address || '224.1.1.1'
  this.port = opts.port || 5007
  this.socket = dgram.createSocket({
    type: 'udp4',
    reuseAddr: true
  })

  this.socket.on('message', this.onmessage.bind(this))

  this.socket.on('close', function () {
    self.emit('close')
  })

  this.socket.on('error', function (err) {
    self.emit('warning', err)
  })

  this.socket.bind(this.port, function () {
    self.socket.addMembership(self.address)
    self.socket.setMulticastTTL(128)
    self.emit('bind')
  })
}

util.inherits(Cast, events.EventEmitter)

Cast.prototype.close = function () {
  this.socket.close()
}

Cast.prototype.onmessage = function (buf) {
  const header = buf.readUInt16BE(0)
  const seq = header >> 2

  this.incoming.put(seq, buf)

  var left = seq
  var right = seq

  while (needsPrev(buf)) {
    buf = this.incoming.get(--left)
    if (!buf) return false
  }

  buf = this.incoming.get(seq)

  while (needsNext(buf)) {
    buf = this.incoming.get(++right)
    if (!buf) return false
  }

  const buffers = []
  for (var i = left; i <= right; i++) {
    buffers.push(this.incoming.get(i).slice(2))
  }
  if (buffers.length === 1) this.onfullmessage(buffers[0])
  else this.onfullmessage(Buffer.concat(buffers))
}

Cast.prototype.onfullmessage = function (buf) {
  this.emit('message', buf)
}

function needsPrev (buf) {
  return buf[1] & 1
}

function needsNext (buf) {
  return buf[1] & 2
}

Cast.prototype.multicast = function (buf, cb) {
  const buffers = this.encode(buf)
  var error = null
  var missing = buffers.length

  for (var i = 0; i < buffers.length; i++) {
    this.socket.send(buffers[i], 0, buffers[i].length, this.port, this.address, done)
  }

  function done (err) {
    if (err) error = err
    if (!--missing && cb) cb(error)
  }
}

Cast.prototype.encode = function (buf) {
  const buffers = []
  var i = 0

  for (i = 0; i < buf.length; i += this.mtu) {
    buffers.push(buf.slice(i, i + this.mtu))
  }

  for (i = 0; i < buffers.length; i++) {
    const wrap = Buffer.allocUnsafe(buffers[i].length + 2)
    const header = ((this.seq++) << 2) + (i < buffers.length - 1 ? 2 : 0) + (i > 0 ? 1 : 0)
    if (this.seq === 16384) this.seq = 0
    wrap.writeUInt16BE(header, 0)
    buffers[i].copy(wrap, 2)
    buffers[i] = wrap
  }

  return buffers
}
