pipe.on('search::render', function render(pagelet) {
  'use strict';

  var placeholders = $(pagelet.placeholders);

  placeholders.find('button[type="submit"]').click(function click(e) {
    e.preventDefault();

    var value = select.val();
    if (!value) return;

    window.location = '/package/'+ select.val();
  });

  var select = placeholders.find('select[name="search"]').selectize({
    valueField: 'name',
    labelField: 'name',
    searchField: 'name',
    createOnBlur: true,
    create: true,

    load: function load(query, callback) {
      if (!query.length) return callback();

      pagelet.complete(query, function complete(err, results) {
        if (err) return callback();

        callback(results);
      });
    },

    render: {
      /**
       * Custom layout renderer for items.
       *
       * @param {Object} item The thing returned from the server.
       * @param {Function} escape Custom HTML escaper.
       * @returns {String}
       * @api private
       */
      option: function render(item, escape) {
        return [
          '<div class="completed">',
            '<strong class="name">'+ escape(item.name) +'</strong>',
            '<span class="description">'+ escape(item.desc) +'</span>',
          '</div>'
        ].join('');
      },

      /**
       * Return an empty string so we can remove the `do you want to create bla
       * bla bla` from the UI.
       *
       * @returns {String}
       * @api private
       */
      option_create: function create(data, escape) {
        return '';
      }
    }
  });
});
