'use strict';

var Pagelet = require('pagelet')
  , Names = require('./names')
  , path = require('path')
  , fs = require('fs');

Pagelet.extend({
  view: 'view.html',      // HTML template.
  css:  'css.styl',       // Custom CSS.
  js:   'client.js',      // Front-end magic.

  path: '/search',
  method: 'POST',

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
   * The names leveldb database that we're going to use for autocompletion.
   *
   * @type {Names}
   * @private
   */
  level: new Names({ refresh: true }),

  /**
   * Return a list of package names. Pagelet.plain is provided by the
   * XHR plugin and prevents a client-side render.
   *
   * @param {Object} fields Form fields.
   * @param {Object} files Form files.
   * @api public
   */
  post: function post(fields, files) {
    var suffix = this.level.suffix
      , pagelet = this;

    this.level.find(fields.query, this.max, function found(err, data) {
      if (err) return pagelet.capture(err);

      pagelet.plain(data.map(function map(row) {
        return {
          name: row.key,
          desc: row.value !== suffix ? row.value : ''
        };
      }));
    });
  }
}).on(module);
