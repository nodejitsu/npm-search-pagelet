'use strict';

var Expirable = require('expirable')
  , Trie = require('triecomplete')
  , request = require('request')
  , Pagelet = require('pagelet')
  , path = require('path')
  , fs = require('fs');

//
// The location of our local cache of the allpackages.json file.
//
var allpackages = path.join(__dirname, 'local', 'allpackages.json');

/**
 * The representation of one single package. We use a custom instance for this
 * so memory can be properly optimized for this single class.
 *
 * @param {String} name The package name.
 * @param {String} desc The package description.
 * @constructor
 * @private
 */
function Package(name, desc) {
  this.name = name;
  this.desc = desc;
}

Pagelet.extend({
  view: 'view.html',      // HTML template.
  css:  'css.styl',       // Custom CSS.
  js:   'client.js',      // Front-end magic.
  rpc: ['complete'],      // Expose method as RPC.

  //
  // External dependencies that should be included on the page using a regular
  // script tag. This dependency is needed for the `client.js` client file.
  //
  dependencies: [
    '//code.jquery.com/jquery-2.1.0.min.js',
    path.join(__dirname, '/selectize.default.css'),
    path.join(__dirname, '/selectize.js')
  ],

  /**
   * Maximum amount of items to show in the auto complete.
   *
   * @type {Number}
   * @public
   */
  max: 50,

  /**
   * [RPC]: Return a list of package names.
   *
   * @param {Function} reply Send a reply to the client.
   * @param {String} query The name of package we're searching for.
   * @api public
   */
  complete: function complete(reply, query) {
    var pagelet = this
      , trie;

    /**
     * Find a Package instance by name.
     *
     * @param {String} name The @ prefixed package name.
     * @returns {Object}
     * @api private
     */
    function find(name) {
      return pagelet.cache.get(name.value);
    }

    if ((trie = this.cache.get('trie'))) return reply(
      undefined, trie.search('@'+ query).map(find).filter(Boolean).slice(0, this.max)
    );

    this.recache(function recache(err) {
      if ((trie = pagelet.cache.get('trie'))) return reply(
        undefined, trie.search('@'+ query).map(find).filter(Boolean).slice(0, pagelet.max)
      );

      reply(undefined, []);
    });
  },

  /**
   * Cache the `npm-github-data` trie's in our expirable cache so we will
   * automatically nuke it when we assume that our cache is out of date.
   *
   * @type {Expirable}
   * @private
   */
  cache: new Expirable('1 hour'),

  /**
   * Save the newly retrieved `allpackages.json` to disk.
   *
   * @type {Boolean}
   * @public
   */
  save: false,

  /**
   * The location of the `allpackages.json`. This URL is configurable so you
   * could use your own fork or repository with this information if you want to.
   *
   * @type {String}
   * @public
   */
  url: 'https://github.com/polyhack/npm-github-data/blob/master/allpackages.json?raw=true',

  /**
   * Re-cache the packages and re-assable all data structures required for our
   * auto complete to function as intended.
   *
   * @param {Function} fn Completion callback
   * @api private
   */
  recache: function recache(fn) {
    var trie = new Trie()
      , pagelet = this
      , rows = [];

    (function fetch(next) {
      pagelet.remote(function remote(err, data) {
        if (!err) return next(err, data);

        pagelet.local(next);
      }, pagelet.save);
    }(function received(err, data) {
      if (err) return fn(err);

      data.forEach(function each(row) {
        //
        // Prefix every package name with `@` to prevent possible hash table
        // attaches where people release names that could be available on the
        // prototype of an object.
        //
        pagelet.cache.set('@'+ row.name, new Package(row.name, row.description));
        rows.push('@'+ row.name);
      });

      //
      // Initialize the trie's with all the package names so we can do some
      // awesome completion.
      //
      trie.initialize(rows.filter(Boolean));
      pagelet.cache.set('trie', trie);

      fn();
    }));
  },

  /**
   * Fetch the dataset from the GitHub repository where it's synced every single
   * day.
   *
   * @param {Function} fn Completion callback.
   * @param {Boolean} save Save the retrieved file to disk.
   * @api private
   */
  remote: function remote(fn, save) {
    request({
      url: this.url,
      method: 'GET'
    }, function received(err, res, body) {
      if (err) return fn(err);
      if (res.statusCode !== 200) return fn(new Error('Invalid status code'));
      if (!body || !body.length) return fn(new Error('No content returned'));

      var data;

      try { data = JSON.parse(data.toString()); }
      catch (e) { err = e; data = undefined; }

      //
      // Async save, there's not much we can when it fails anyways.
      //
      if (save && data) fs.writeFile(allpackages, body, function idontcare() {});

      fn(err, data);
    });
  },

  /**
   * In addition to retrieving the latest file from the GitHub repository we
   * also ship an "offline" version of it in our local cache. This should be
   * considered out of date information but it's better in this case to have out
   * of date information instead of no information at all.
   *
   * @param {Function} fn Completion callback.
   * @api private
   */
  local: function local(fn) {
    fs.readFile(allpackages, function (err, data) {
      if (err) return fn(err);

      try { data = JSON.parse(data.toString()); }
      catch (e) { err = e; data = undefined; }

      fn(err, data);
    });
  }
}).on(module);

//
// Pre-heat the cache>
//
module.exports.prototype.recache.bind(module.exports.prototype)(function cached() {
  // Nothing important here.
});
