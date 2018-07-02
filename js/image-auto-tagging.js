(function ($, Drupal, drupalSettings) {

  /**
   * Helper method for calculation of time.
   *
   * @return {string}
   */
  var time = function () {
    var now = new Date();
    var time = /(\d+:\d+:\d+)/.exec(now)[0] + ':';
    for (var ms = String(now.getMilliseconds()), i = ms.length - 3; i < 0; ++i) {
      time += '0';
    }

    return time + ms;
  };

  /**
   * Helper function for a bit nicer logging.
   *
   * @param msg
   * @param source
   */
  var bitNicerLog = function (msg, source) {
    source = source || 'Base';

    console.log('%c[' + time() + '] %c' + source + ': %c' + msg,
      'color: #87CEEB;',
      'color: #CD5C5C;',
      'color: #000000;'
    );
  };

  /**
   * Init for DropzoneJS plugin.
   *
   * @type {{attach: attach}}
   */
  Drupal.behaviors.initAuotTagging = {
    attach: function () {
      $.each(drupalSettings.dropzonejs.instances, function (dropzoneId) {
        $('#' + dropzoneId)
          .once('init-auto-tagging')
          .addClass('image-auto-tagging__initializing-dropzone')
      });
    }
  };

  /**
   * Try to fill classifications to tag element.
   */
  Drupal.behaviors.setImageClassification = {
    attach: function () {
      fillClassifications();
    }
  };

  /**
   * Private variables.
   */
  var classificationQueue = [];
  var classifiedImages = [];

  var timers = {};

  /**
   * Fill classification tags into Tag field.
   *
   * Discover Tag fields based on "data-autocomplete-path" for input field.
   */
  var fillClassifications = function () {
    if (classificationQueue.length === 0) {
      var $tagFields = $('input[data-autocomplete-path^="/entity_reference_autocomplete/taxonomy_term/"]')
        .once('fill-classification-for-image');

      if ($tagFields.length > 1) {
        $tagFields.each(
          function (index, element) {
            var $tagField = $(element);

            $tagField.val(classifiedImages[index].classifications.join(', '));
          }
        );
      }
      else {
        if ($tagFields.length === 1) {
          $($tagFields[0])
            .val(classifiedImages[classifiedImages.length - 1].classifications.join(', '));
        }
      }
    }
  };

  /**
   * Init required object for classification when worker is ready.
   */
  var onWorkerReady = function () {
    // Create canvas and image object used to get data for worker.
    var canvas = document.createElement('canvas');
    var image = new Image();

    // On image load, start worker classification process.
    image.onload = function () {
      canvas.width = this.naturalWidth;
      canvas.height = this.naturalHeight;

      var ctx = canvas.getContext('2d');
      ctx.drawImage(this, 0, 0);

      worker.postMessage({
        type: 'execute',
        image_data: ctx.getImageData(0, 0, this.naturalWidth, this.naturalHeight)
      });
      timers.start_classify_image = new Date();

      classificationQueue.push(image.src);

      bitNicerLog('Classification is started.');
    };

    // Register for all dropzone instance handler when uploading of file is
    // started.
    $.each(drupalSettings.dropzonejs.instances, function (dropzoneId, dropzoneObject) {
      $('#' + dropzoneId)
        .removeClass('image-auto-tagging__initializing-dropzone');

      dropzoneObject.instance.on('sending', function (file) {
        if (file.type.indexOf('image/') === 0) {
          image.src = window.URL.createObjectURL(file);
        }
      });
    });

    bitNicerLog('Worker is ready after: ' + ((new Date()) - timers.worker_init) + 'ms');
  };

  var onWorkerMessage = function (event) {
    switch (event.data.type) {
      case 'debug':
        bitNicerLog(event.data.msg, event.data.source);

        break;

      case 'init':
        worker.postMessage({
          type: 'load',
          model_name: drupalSettings.image_auto_tagging.model
        });

        break;

      case "ready":
        onWorkerReady();

        break;

      case "finished":
        var classification_time = (new Date()) - timers.start_classify_image;
        bitNicerLog('Got classifications: ' + classification_time + 'ms');
        console.log(event.data.classifications);

        classifiedImages.push({
          'classifications': $.unique(event.data.classifications)
        });

        // If whole queue is processes, try to fill form with classifications.
        classificationQueue.shift();
        if (classificationQueue.length === 0) {
          fillClassifications();
        }

        break;
    }
  };

  // Create worker process and register event listener.
  var workerUrl = '/' + drupalSettings.image_auto_tagging.path + '/js/opencv/image-classification-worker.js';
  timers.worker_init = new Date();

  var worker = new Worker(workerUrl);
  worker.onmessage = onWorkerMessage;

}(jQuery, Drupal, drupalSettings));
