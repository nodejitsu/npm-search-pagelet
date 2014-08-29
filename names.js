'use strict';

var debug = require('diagnostics')('names')
  , httpsgc = require('./httpsgc')
  , async = require('async')
  , level = require('level')
  , path = require('path');

function nope() { /* used to prevent double execution */ }

/**
 * Names: Autocomplete for npm package names through leveldb #buzzwordbingo.
 *
 * Options:
 *
 * - url: The API endpoint where we can get the package data from. It should
 *   return an array with objects contain a name and description.
 * - interval: Refresh interval of the data.
 * - suffix: Suffix key which will be appended to key names so we can get
 *   a range.
 * - db: The location of the database.
 *
 * @constructor
 * @param {Object} options Configuration of the names.
 * @api private
 */
function Names(options) {
  if (!this) return new Names(options);

  options = options || {};

  this.url = options.url || 'https://raw.githubusercontent.com/polyhack/npm-github-data/master/allpackages.json';
  this.interval = +options.interval || 1000 * 60 * 60;
  this.suffix = options.suffix || '\xff';
  this.db = level(options.db || path.join(__dirname, 'names.db'), {
    valueEncoding: 'utf-8'
  });

  if (options.refresh) this.refresh();
  this.setInterval = setInterval(this.refresh.bind(this), this.interval);
}

/**
 * Refresh the current dataset.
 *
 * @param {Function} fn Completion callback.
 * @returns {Names}
 * @api private
 */
Names.prototype.refresh = function refresh(fn) {
  fn = fn || function nope(err) {
    if (err) debug('failed to refresh, received error', err);
  };

  var names = this;

  async.parallel({
    remote: this.fetch.bind(this),
    keys: this.keys.bind(this)
  }, function nexted(err, data) {
    if (err) return fn(err);

    var ops = []
      , existing;

    //
    // Map existing values to an object for easy matching.
    //
    existing = data.keys.reduce(function reduce(memo, row) {
      memo[row.key] = row.value;
      return memo;
    }, {});

    data.remote.forEach(function each(row) {
      //
      // Non existing row, we should remove this from our database.
      //
      if (!(row.name in existing)) ops.push({ type: 'del', key: row.name });

      //
      // Prevent duplicate put requests, the data already exists in the database
      // so we don't need to update it anymore. Saving a bit of CPU.
      //
      if (existing[row.name] === row.desc) return;

      ops.push({ type: 'put', key: row.name, value: row.desc || names.suffix });
    });

    names.db.batch(ops, fn);
  });

  return this;
};

/**
 * Fetch the remote API of things.
 *
 * @param {Function} fn Completion callback.
 * @returns {Names}
 * @api private
 */
Names.prototype.fetch = function fetch(fn) {
  fn = fn || function nope(err) {
    if (err) debug('failed to fetch, received error', err);
  };

  httpsgc(this.url, function fetched(err, body) {
    if (err) return fn(err);
    if (!body || !body.length) return fn(new Error('No content returned'));

    var data;

    try {
      data = JSON.parse(body.toString());

      if (!Array.isArray(data)) throw new Error('Invalid data structure');
    } catch (e) { return fn(e); }

    debug('received %d rows', data.length);

    return fn(undefined, data.map(function reduce(row) {
      return {
        desc: row.description,
        name: row.name
      };
    }).filter(function filter(row) {
      return !!row.name;
    }));
  }, true);

  return this;
};

/**
 * Get all keys from the database.
 *
 * @param {Function} fn Completion callback
 * @returns {Names}
 * @api private
 */
Names.prototype.keys = function keys(fn) {
  var all = [];

  this.db.createReadStream()
  .on('data', function dataset(data) {
    all.push(data);
  }).on('end', function end() {
    fn(undefined, all);
  }).on('error', function error(e) {
    fn(e, all);
    fn = nope;
  });

  return this;
};

/**
 * Search for matches.
 *
 * @param {String} name The name we should search.
 * @param {Function} fn Completion callback.
 * @returns {Names}
 * @api private
 */
Names.prototype.find = function find(name, limit, fn) {
  var results = [];

  if ('function' === typeof limit) {
    fn = limit;
    limit = -1;
  }

  this.db.createReadStream({
    gte: name,
    lte: name + this.suffix,
    limit: limit
  }).on('data', function receive(data) {
    results.push(data);
  }).on('end', function end() {
    fn(undefined, results);
  }).on('error', function error(e) {
    fn(e, results);
    fn = nope;
  });

  return this;
};

/**
 * Destroy the database.
 *
 * @param {Function} fn Completion callback
 * @returns {Names}
 * @api public
 */
Names.prototype.destroy = function destroy(fn) {
  if (this.setInterval) clearInterval(this.setInterval);
  this.db.close(fn);
  return this;
};

//
// Expose the leveldb names database.
//
module.exports = Names;
