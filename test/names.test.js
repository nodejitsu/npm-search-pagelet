describe('names.db', function () {
  'use strict';

  this.timeout(2000000);

  var Names = require('../names')
    , assume = require('assume')
    , db;

  beforeEach(function each() {
    db = new Names();
  });

  before(function each(next) {
    var db = new Names();

    db.refresh(function (e) {
      db.destroy(function (ee) {
        next(e || ee);
      });
    });
  });

  afterEach(function each(next) {
    db.destroy(next);
  });

  describe('.fetch', function () {
    it('gets an array of pk names', function (next) {
      db.fetch(function fetched(err, arr) {
        if (err) return next(err);

        assume(arr).to.be.a('array');
        arr.forEach(function (row) {
          assume(row.name).to.be.a('string');
          assume(row.name).to.be.a('string');
        });

        next();
      });
    });
  });

  describe('.find', function () {
    it('returns keys for a given range', function (next) {
      db.find('primus', function (err, data) {
        if (err) return next(err);

        assume(data).to.be.a('array');
        assume(data[0]).to.be.a('object');
        assume(data[0].key).to.be.a('string');
        assume(data[0].value).to.be.a('string');

        next();
      });
    });
  });

  describe('.keys', function () {
    it('returns all the things', function (next) {
      db.keys(function (err, data) {
        if (err) return next();

        assume(data).to.be.a('array');
        assume(data[0]).to.be.a('object');
        assume(data[0].key).to.be.a('string');
        assume(data[0].value).to.be.a('string');

        next();
      });
    });
  });
});
