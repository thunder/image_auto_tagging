/**
 * Image classification worker.
 *
 * This worker supports following API calls:
 *   - load     = load model. Params: model_name
 *   - execute  = execute classification of image. Params: image_data
 *
 * And it responds with following messages:
 *   - init     = when initial loading of libraries is finished.
 *   - ready    = response for "load" command, when model is ready.
 *   - finished = response for "execute" command, when classification is done.
 *                  Params: classifications
 *   - debug    = used to send logging messages. Params: msg
 *
 * @type {string}
 */

var opencv;

// Take vendor prefixes in account.
self.postMessage = self.webkitPostMessage || self.postMessage;

/**
 * Path to models directory, relative to Worker file.
 * @type {string}
 */
var baseModelsPath = '../../models/';

/**
 * Configuration for this classification worker, depends on loaded model.
 *
 * @type {object}
 */
var configuration = null;

/**
 * Instance of deep neural network for image classification.
 *
 * @type {object}
 */
var dnnInstance = null;

/**
 * Helper function for logging to get information about source worker.
 *
 * @return {string}
 *   Returns source for logging messages.
 */
function source() {
  'use strict';

  return 'Classification Worker';
}

/**
 * Logging function. It's required because Worker doesn't output console logs.
 *
 * Logging should be done in following way:
 *   console.log.apply(console, event.data.msg);
 *
 * @param {string} msg
 *   Message that should be logged.
 */
function log(msg) {
  'use strict';

  self.postMessage({
    type: 'debug',
    source: source(),
    msg: msg
  });
}

/**
 * Helper function to create files for OpenCV.
 *
 * @param {string} in_memory_path
 *   Path to file that will be stored in memory.
 * @param {string} url
 *   Url for file.
 * @param {function} callback
 *   Callback function when file is stored.
 */
function createFileFromUrl(in_memory_path, url, callback) {
  'use strict';

  var request = new XMLHttpRequest();

  request.open('GET', url, true);
  request.responseType = 'arraybuffer';
  request.onload = function () {
    if (request.readyState === 4) {
      if (request.status === 200) {
        // eslint-disable-next-line no-undef
        var data = new Uint8Array(request.response);
        opencv.FS_createDataFile('/', in_memory_path, data, true, false, false);

        callback();
      }
      else {
        // eslint-disable-next-line no-console
        console.log('Failed to load ' + url + ' status: ' + request.status);
      }
    }
  };

  request.send();
}

/**
 * Function to load model files.
 *
 * @param {string} modelName
 *   Model name for classification.
 */
function loadModel(modelName) {
  'use strict';

  var configFile = modelName + '.json';

  // TODO: Move information to JSON file.
  var modelFile = modelName + '.pbtxt';
  var weightsFile = modelName + '.pb';

  createFileFromUrl(configFile, baseModelsPath + configFile, function () {
    createFileFromUrl(modelFile, baseModelsPath + modelFile, function () {
      createFileFromUrl(weightsFile, baseModelsPath + weightsFile, function () {
        configuration = JSON.parse(opencv.read(baseModelsPath + configFile));

        switch (configuration.type) {
          case 'tensorflow':
            dnnInstance = opencv.readNetFromTensorflow(weightsFile, modelFile);
            break;

          // TODO: Add Caffe support.
          case 'caffe':
            dnnInstance = opencv.readNetFromCaffe(modelFile, weightsFile);
            break;
        }

        // Post worker message
        self.postMessage({
          type: 'ready'
        });
      });
    });
  });
}

/**
 * Execute image classification.
 *
 * @param {array} imageData
 *   Binary image data.
 */
function executeClassification(imageData) {
  'use strict';

  var i;
  var n;
  var image_config = configuration.image;
  var classification_tags = configuration.tags;
  var output_config = configuration.output;

  // Prepare image data for usage in Open CV library.
  var matImage = opencv.matFromImageData(imageData);
  var frameBGR = new opencv.Mat(imageData.height, imageData.width, opencv.CV_8UC3);
  opencv.cvtColor(matImage, frameBGR, opencv.COLOR_RGBA2BGR);

  // Get image data for DNN input.
  var dnnInput = opencv.blobFromImage(
    frameBGR,
    image_config.scale,
    image_config.size,
    image_config.normalization,
    image_config.swap_colors,
    false
  );

  // Execute DNN.
  dnnInstance.setInput(dnnInput);
  var dnnOutput = dnnInstance.forward();
  var outputData = dnnOutput.data32F;

  // Process result and get classifications.
  var classifications = [];
  for (i = 0, n = outputData.length; i < n; i += output_config.data_interval) {
    if (outputData[i + output_config.recognition_offset] > output_config.recognition_threshold) {
      classifications.push(classification_tags[outputData[i + output_config.class_offset]]);
    }
  }

  dnnInput.delete();
  dnnOutput.delete();

  // Send list of faces from this worker to the page.
  self.postMessage({
    type: 'finished',
    classifications: classifications
  });
}

/**
 * On message handler.
 *
 * @param {object} event
 *   Message event for Worker.
 */
self.onmessage = function (event) {
  'use strict';

  switch (event.data.type) {
    case 'load':
      log('Loading model: ' + event.data.model_name);

      loadModel(event.data.model_name);
      break;

    case 'execute':
      executeClassification(event.data.image_data);
      break;
  }
};

log('Initialization started');

// Create Worker with importing OpenCV library.
// eslint-disable-next-line no-undef
importScripts('opencv_js.js');

// cv() - will be provided from OpenCV library.
// eslint-disable-next-line no-undef
cv()
  .then(function (cv_) {
    'use strict';

    opencv = cv_;

    // Post worker message
    self.postMessage({
      type: 'init'
    });
  });
