pipe.on('search::render', function render(pagelet) {
  'use strict';

  var placeholders = $(pagelet.placeholders);

  /**
   * Bypass the submit functionality and just redirect manually so we don't have
   * to do a server callback.
   *
   * @param {Event} e Optional event
   * @api private
   */
  function redirect(e) {
    if (e && e.preventDefault) e.preventDefault();

    //
    // Assume that the value in the $control_input is uptodate. If not get the
    // value directly through the constructor. When the selectize is still
    // loading results the `getValue()` will return an empty value. This is why
    // we do a double value check.
    //
    var selectize = select[0].selectize
      , value = selectize.$control_input.val() || selectize.getValue();

    if (!value) return;

    window.location = '/package/'+ value;
  }

  placeholders.find('form').submit(redirect);

  var select = placeholders.find('select[name="search"]').selectize({
    valueField: 'name',
    labelField: 'name',
    searchField: 'name',
    createOnBlur: true,
    create: true,

    /**
     * Load the autocomplete results through the Pagelet's RPC methods.
     *
     * @param {String} query Thing that we search for
     * @param {Function} callback Callback
     * @api private
     */
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
           'string' === typeof item.desc ? '<span class="description">'+ escape(item.desc) +'</span>' : '',
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
    },

    /**
     * Automatically submit form when item is clicked.
     *
     * @api private
     */
    onItemAdd: function itemadd() {
      setTimeout(redirect, 0);
    }
  });

  //
  // Make sure that the input is focused by default so we can immediately start
  // typing the package we want to search.
  //
  select[0].selectize.focus();

  //
  // Add an additional changes listener as the `selectize` library has no way to
  // hook in to the emitted keyup events. We want our form to submit as fast and
  // as soon possible so we're gonna allow people to press "enter" and submit
  // the current value that is their input/autocomplete field.
  //
  placeholders.on('keyup', 'form', function (e) {
    if (13 === e.which) redirect(e);
  });
});
