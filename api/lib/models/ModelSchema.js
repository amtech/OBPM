"use strict";
var joi = require('joi');
function modelSchema(type) {
    var obj = joi.object();
    obj['__modelType'] = type;
    obj['getModelType'] = function () {
        return this['__modelType'];
    };
    return obj;
}
exports.__esModule = true;
exports["default"] = modelSchema;
