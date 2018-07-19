const swarm = require('./')
const hypercore = require('hypercore')
const ram = require('random-access-memory')

const feed = hypercore(ram)
const sw = swarm(feed)

feed.append(Buffer.alloc(99999))
feed.append('hello world', function () {
  createSwarm(feed.key).on('bind', function () {
    sw.multicast(0)
    sw.multicast(1)
  })
})

function createSwarm (key) {
  const feed = hypercore(ram, key)
  feed.on('download', console.log)
  return swarm(feed)
}
