"use strict";
require('reflect-metadata');
function property(binder) {
    return function (target, methodName) {
        Reflect.defineMetadata('binder', binder, target, methodName);
    };
}
exports.property = property;
function model(binder) {
    return function (target) {
        Reflect.defineMetadata('binder', binder, target.prototype);
    };
}
exports.model = model;
