# Image Auto Tagging

Image auto tagging module uses machine learning to detect objects on image and classify them.
Classifications done by machine learning image classification model will be used as Tags for new image.

## Note

This is prototype of Drupal module for auto tagging of images.

## Requirements

This module requires OpenCV library and deep neural network model saved in [TensorFlow](https://www.tensorflow.org) format.

### Patch for Entity Browser module

Since this module add new widget for entity browser it requires some additional functionality that is not already inside entity browser module. So we need following patch [https://www.drupal.org/files/issues/2858438_6.patch](https://www.drupal.org/files/issues/2858438_6.patch) for `entity_browser`.

If `composer` workflow is used for build of project it should be sufficient just to add following setting into project `composer.json`.
```
    "require": {
        "cweagans/composer-patches": "^1.6",
    },
    "extra": {
        "enable-patching": true
    },
``` 

If other way of project building is used, then you have to apply patch according to that project building method.

### OpenCV

The OpenCV library should be build for JavaScript in WebAssembly format. In order to compile OpenCV in WebAssembly format Emscripten is required.
Installation instruction for Emscripten can be found on this page: [https://kripken.github.io/emscripten-site/docs/getting_started/downloads.html](https://kripken.github.io/emscripten-site/docs/getting_started/downloads.html)

After Emscripten environment is started you can checkout OpenCV project from [https://github.com/opencv/opencv](https://github.com/opencv/opencv) and build it.

After project is checked execute following commands:
```
# Change to OpenCV directory and run following command to build it for WebAssembly.
python platforms/js/build_js.py --build_wasm ./build_wasm

# Note: supported python version is 2.7
```

Files will be placed in `./build_wasm/bin` and following files 
```
opencv_js.js
opencv_js.wasm
```
should be copied to `js/opencv/` directory of `image_auto_tagging` module. 

### Deep Neural Network Model

In order to have auto tagging work, you need module that will do classification.

We have tested with example of [MobileNet](https://arxiv.org/abs/1704.04861) trained on [Coco dataset](http://cocodataset.org).

First requirement is module structure and can be downloaded for here: [https://raw.githubusercontent.com/opencv/opencv_extra/master/testdata/dnn/ssd_mobilenet_v1_coco.pbtxt](https://raw.githubusercontent.com/opencv/opencv_extra/master/testdata/dnn/ssd_mobilenet_v1_coco.pbtxt)
and it should be copied to in `models` directory of `image_auto_tagging`.
Next requirement is trained data for that model and that is already pre-trained data that can be downloaded from github: [http://download.tensorflow.org/models/object_detection/ssd_mobilenet_v1_coco_2017_11_17.tar.gz](http://download.tensorflow.org/models/object_detection/ssd_mobilenet_v1_coco_2017_11_17.tar.gz). From that archive file, only one file is required.
File `frozen_inference_graph.pb` for that archive should be copied to in `models` directory of `image_auto_tagging` module and renamed into `ssd_mobilenet_v1_coco.pb`.

## How to use

The module provides upload widget for `entity_browser` module.
Widget will provide drop-zone where files can be dropped and after upload it will display editing form for image file, where field with tags will be populated with detected categories.

## Future plans

- Improve way for loading of Model (because it should be sufficient to load model only from .pb file)
- [Caffe framework](http://caffe.berkeleyvision.org) support
