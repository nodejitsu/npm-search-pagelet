# npm-search-pagelet

A really simple search box/auto-complete for npm modules. Great to be used in
conjunction with our `package-pagelet` and `npm-dependencies-pagelet`.

## Installation

This package is released in the public npm registry and can be installed using:

```
npm install --save npm-search-pagelet
```

Please note that this module should be used together with the [BigPipe]
framework.

## Configuration

There are various of options that can be configured in the pagelet.

- **cache**: A synchronous cache instance that is used to store the looked up
  package names and descriptions. This currently defaults to the `expirable`
  module with an expiration of `1 hour`.
- **max**: The maximum amount of items that we should send the client. This
  defaults to 50.
- **save**: A boolean indicating if we should store the remotely fetched package
  data locally. This is used as backup for when the upstream source is
  unavailable.
- **url**: The location of the list of package names + descriptions. We assume
  it's a file that contains an array with objects with a name and description
  properties.

These options should be set when you're extending the `npm-search-pagelet`

```js
module.exports = require('npm-search-pagelet').extend({
  max: 10 // only show 10 items
});
```

You can see a working version of this pagelet on: http://browsenpm.org/

[BigPipe]: https://github.com/bigpipe/bigpipe
