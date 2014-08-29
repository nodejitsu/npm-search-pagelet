'use strict';

//
// This file might be the biggest WTF that you've read today. And you are right.
// WTF am I doing here. The reason for spawning requests is that I've discovered
// a memory leak in node's https.get method which causes memory to be retained
// after doing large reqeusts. In our case we've got fetch a 15 MB file hourly to
// ensure that we've got the latest and greatest of data. This can lead to huge
// node processes which will eventually die because of ENOMEM.
//

var debug = require('diagnostics')('httpgc')
  , spawn = require('child_process').spawn
  , hash = require('crypto').createHash
  , which = require('which').sync
  , path = require('path')
  , fs = require('fs')
  , curl
  , wget;

//
// Attempt to detect which of these are installed on the host system in order to
// download a file.
//
try { curl = which('curl'); }
catch (e) {}

try { wget = which('wget'); }
catch (e) {}

/**
 * Request a HTTP resource and return it's contents.
 *
 * @param {String} url The HTTPS URL that we need to fetch.
 * @param {String} using Optionally force which fetch engine we should use.
 * @param {Function} fn Completion callback.
 * @param {Boolean} disk Store file to disk instead of streaming spawns.
 * @api private
 */
function request(url, using, fn, disk) {
  if ('function' === typeof using) {
    disk = fn;
    fn = using;
    using = null;
  }

  if (!using) {
    if (curl) using = 'curl';
    else if (wget) using = 'wget';
    else using = 'node';
  }

  debug('requesting '+ url +' using '+ using);
  request[using + ( disk ? 'd' : '')](url, fn);
}

/**
 * Minimal factory for creating spawns from hell. The arguments for command can
 * contain a special %url% string which will be replaced with the URL that we're
 * about to execute.
 *
 * @param {String} cmd Name of the command we need to execute.
 * @param {Array} arg Arguments for the command.
 * @param {Boolean} read Readout the saved file and unlink.
 * @api private
 */
request.factory = function factory(cmd, arg, read) {
  arg = Array.isArray(arg) ? arg : [arg];

  //
  // Simple counter to prevent multiple requests to the same URL remove and add
  // the same file when in read mode.
  //
  var index = 0;

  return function hellspawn(url, fn) {
    var file = path.join(__dirname, hash('md5').update(url).digest('hex')) +'-'+ index++
        , chunks = []
        , size = 0
        , child;

    child = spawn(cmd, arg.map(function map(arg) {
      return arg
        .replace('%url%', url)
        .replace('%dir%', file);
    }));

    child.stdout.on('data', function queue(data) {
      size += data.length;
      chunks.push(data);
    });

    child.stdout.on('end', function queue(data) {
      if (data) {
        size += data.length;
        chunks.push(data);
      }
    });

    child.on('exit', function exit(code) {
      if (code !== 0) fn(new Error('Received invalid status code from '+ cmd));
      else fn(undefined, read ? fs.readFileSync(file, 'utf-8') : Buffer.concat(chunks, size));

      //
      // Clean up all our things.
      //
      if (read) fs.unlinkSync(file);
      chunks.length = size = 0;
    });
  };
};

//
// Regular requests.
//
request.curl = request.factory('curl', ['%url%']);
request.wget = request.factory('wget', ['-qO-', '%url%']);
request.node = request.factory('node', ['-e', 'require("https").get("%url%",function(r){r.pipe(process.stdout)})']);

//
// Write to disk requests.
//
request.curld = request.factory('curl', ['-o', '%dir%', '%url%'], true);
request.wgetd = request.factory('wget', ['%url%', '-O', '%dir%'], true);
request.noded = request.factory('node', ['-e', 'require("https").get("%url%",function(r){r.pipe(require("fs").createWriteStream("%dir%"))})']);

//
// Expose the module.
//
module.exports = request;
