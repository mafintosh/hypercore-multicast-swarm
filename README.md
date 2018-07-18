# hypercore-multicast-swarm

Multicast [hypercore](https://github.com/mafintosh/hypercore) data over a multicast UDP socket

```
npm install hypercore-multicast-swarm
```

Still does all the data verification that hypercore normally does etc, it's just multicast!

## Usage

``` js
const mswarm = require('hypercore-multicast-swarm')

// this will make the hypercore listen for multicast data on the network.
// when it receives a message it doesn't have it will verify it and store it.
const swarm = mswarm(someHypercoreFeed)

someHypercoreFeed.on('download', function (seq, data) {
  console.log('we recevied ' + seq + ' over multicast')
})

// to multicast a hypercore entry
swarm.multicast(42) // multicasts entry 42
```

## API

#### `swarm = mswarm(feed, [options])`

Make a hypercore feed join the multicast swarm. Options include:

```js
{
  mtu: 900,
  port: 5007,
  address: '224.1.1.1' // the multicast address to use
}
```

No hypercore messages are multicast until you call the `multicast` api below

#### `swarm.multicast(seq, [callback])`

Multicast the entry stored at `seq` in the feed.
The callback is called when the underlying udp socket has been flushed.

## License

MIT
