/**
 *
 * # Fastbinder
 *
 * Fast and worry-free dynamic event binding.
 *
 * https://github.com/andrewchilds/fastbinder
 *
 * ## Supported Attributes
 *
 * - data-on-blur
 * - data-on-click
 * - data-on-change
 * - data-on-focus
 * - data-on-hover
 * - data-on-keydown
 * - data-on-keyup
 * - data-on-mousedown
 * - data-on-mouseup
 * - data-on-scroll
 * - data-on-submit
 *
 * ## Scope to Controller
 *
 * - data-controller
 *
 * ## Usage
 *
 * jQuery.fastbinder();
 * jQuery.fastbinder({ hoverDelay: 250 });
 * jQuery.fastbinder.setOptions({ forceExternalLinks: false });
 * jQuery.fastbinder.destroy();
 *
 * ## Attribute Examples
 *
 * <input type="text" data-on-change="MyLibrary.myFunction" />
 * <a href="#" data-on-click="MyLibrary.myFunction">Execute myFunction on click</a>
 *
 */
(function ($) {

  // Utils

  // Faster than jQuery.data
  function data(el, name, val) {
    return attr(el, 'data-' + name, val);
  }

  function attr(el, name, val) {
    if (el && el.jquery) {
      el = el[0];
    }
    if (el && el.getAttribute) {
      if (typeof val !== 'undefined') {
        el.setAttribute(name, val);
      } else {
        var elAttr = el.getAttribute(name);
        return convertNumber(elAttr);
      }
    }
  }

  function convertNumber(str) {
    return (str === '' || isNaN(str)) ? str : parseFloat(str);
  }

  function strToFunction(functionName, context) {
    context = context || window;
    var namespaces = functionName.split('.');
    var func = namespaces.pop();
    for (var i = 0; i < namespaces.length; i++) {
      if (namespaces[i]) {
        if (!context[namespaces[i]]) {
          return false;
        }
        context = context[namespaces[i]];
      }
    }
    return context[func];
  }

  function getController(target) {
    var controller = '';
    var controllerElement = target.closest('[data-controller]');
    if (controllerElement.length > 0) {
      controller = $.fastbinder.options.controllerPrefix + data(controllerElement, 'controller');
    }
    return controller;
  }

  function isEnterKey(e) {
    return e && e.which === 13;
  }

  // Handlers

  function fireEventHandler(target, eventType, e) {
    if (target.length > 0) {
      var handler = data(target, eventType);
      if (handler) {
        var controller = getController(target);
        var controllerHandlerFn = strToFunction(controller + '.' + handler);
        var handlerFn = strToFunction(handler);
        var beforeFn = $.fastbinder.options.beforeEventHandlerFn;

        if (typeof controllerHandlerFn === 'function') {
          if (typeof beforeFn === 'function') {
            beforeFn({
              controller: controller,
              handler: handler,
              eventType: eventType,
              targetElement: target[0]
            });
          }

          return controllerHandlerFn.call(target[0], e);
        }

        if (typeof handlerFn === 'function') {
          if (typeof beforeFn === 'function') {
            beforeFn({
              handler: handler,
              eventType: eventType,
              targetElement: target[0]
            });
          }

          return handlerFn.call(target[0], e);
        }
      }
    }
  }

  function genericBinder(options) {
    options = $.extend({
      attribute: 'on-click',
      beforeTrigger: null,
      context: document.body,
      delay: 0,
      deferLookup: false,
      name: 'click'
    }, options);

    var names = options.name.split(' ');
    $.each(names, function (key, val) {
      names[key] = val + '.' + $.fastbinder.options.namespace;
    });

    var timeout;
    $(options.context).on(names.join(' '), function (e) {
      var target = $(e.target).closest('[data-' + options.attribute + ']');

      if (options.beforeTrigger && !options.beforeTrigger(e)) {
        return;
      }
      if (target.length || options.deferLookup) {
        var fn = function () {
          if (options.deferLookup) {
            target = $(e.target).closest('[data-' + options.attribute + ']');
            if (target.length === 0) {
              return;
            }
          }
          return fireEventHandler(target, options.attribute, e);
        };
        var delay = (options.delay && $.isFunction(options.delay)) ? options.delay(target) : options.delay;
        if (delay) {
          clearTimeout(timeout);
          timeout = setTimeout(fn, delay);
        } else {
          return fn();
        }
      }
    });
  }

  function initKeyupHandler() {
    var timeoutID;
    $(window).on('keydown.' + $.fastbinder.options.namespace, function (e) {
      var target = $(document.activeElement);
      if (target.is('input, textarea')) {
        var fn = function () {
          fireEventHandler(target, 'on-keydown', e);
        };
        if ($.fastbinder.options.keydownDelay > 0) {
          clearTimeout(timeoutID);
          timeoutID = setTimeout(fn, $.fastbinder.options.keydownDelay);
        } else {
          fn();
        }
      }
    }).on('keyup.' + $.fastbinder.options.namespace, function (e) {
      var target = $(document.activeElement);
      if (target.is('input, textarea')) {
        if (isEnterKey(e)) {
          fireEventHandler(target, 'on-submit', e);
        } else {
          var fn = function () {
            fireEventHandler(target, 'on-keyup', e);
          };
          if ($.fastbinder.options.keyupDelay > 0) {
            clearTimeout(timeoutID);
            timeoutID = setTimeout(fn, $.fastbinder.options.keyupDelay);
          } else {
            fn();
          }
        }
      }
    });
  }

  function handleExternalLinks(e) {
    // Handle proper links
    var target = $(e.target);
    if (target.is('a') && target.attr('href') &&
      target.attr('href') !== '#' && !data(target, 'on-click')) {
      if ($.fastbinder.options.forceExternalLinks && !target.attr('target') &&
        target.attr('href').toLowerCase().indexOf('http') === 0) {
        target.attr('target', '_blank');
      }
      return false;
    }
    return true;
  }

  // Public API

  $.fastbinder = function (options) {
    $.fastbinder.setOptions(options);
    $.fastbinder.destroy();
    $.fastbinder.init();
  };

  $.fastbinder.on = genericBinder;
  $.fastbinder.strToFunction = strToFunction;
  $.fastbinder.getController = getController;
  $.fastbinder.fireEventHandler = fireEventHandler;

  $.fastbinder.defaults = {
    namespace: 'fastbinder',
    controllerPrefix: '',
    hoverDelay: 50,
    keydownDelay: 0,
    keyupDelay: 50,
    scrollDelay: 50,
    forceExternalLinks: true,
    beforeEventHandlerFn: null
  };

  $.fastbinder.setOptions = function (options) {
    $.fastbinder.options = $.extend($.fastbinder.options || $.fastbinder.defaults, options);
  };

  $.fastbinder.destroy = function () {
    $(document.body).off('.' + $.fastbinder.options.namespace);
    $(window).off('.' + $.fastbinder.options.namespace);
  };

  $.fastbinder.off = function (eventName) {
    $(document.body).off(eventName + '.' + $.fastbinder.options.namespace);
    $(window).off(eventName + '.' + $.fastbinder.options.namespace);
  };

  $.fastbinder.init = function () {
    $.fastbinder.on({ name: 'click', attribute: 'on-click', beforeTrigger: handleExternalLinks });
    $.fastbinder.on({ name: 'mousedown', attribute: 'on-mousedown' });
    $.fastbinder.on({ name: 'mouseup', attribute: 'on-mouseup' });
    $.fastbinder.on({ name: 'submit', attribute: 'on-submit', context: window });
    $.fastbinder.on({ name: 'change', attribute: 'on-change', context: window });
    $.fastbinder.on({ name: 'focusin', attribute: 'on-focus' });
    $.fastbinder.on({ name: 'focusout', attribute: 'on-blur' });

    $.fastbinder.on({
      name: 'scroll',
      attribute: 'on-scroll',
      context: window,
      delay: function () {
        return $.fastbinder.options.scrollDelay;
      },
      deferLookup: true
    });
    $.fastbinder.on({
      name: 'mousemove',
      attribute: 'on-hover',
      delay: function (target) {
        return data(target, 'hover-delay') || $.fastbinder.options.hoverDelay;
      },
      deferLookup: true
    });

    initKeyupHandler();
  };

}(window.jQuery));
