"use strict";
var joi = require('joi');
var q = require('q');
var ModelState_1 = require('./ModelState');
require('reflect-metadata');

/**
 * Binds provided data to an object instance.
 * If the instance provides a schema, the incoming data gets validated
 * before the binding
 */
var ModelBinder = (function () {
    function ModelBinder() {
    }
    /**
     * Binds the provided data to the instance.
     * The returned promise gets resolved if no binding errors occured.
     * If rejected, the binding error is provided.
     *
     * @param instance The object instance to bind to.
     * @param data The data to bind.
     * @returns {Promise<any>}
     */
    ModelBinder.prototype.bind = function (instance, data, modelState) {
        var _this = this;
        var objBinder = Reflect.getMetadata('binder', instance);
        if (objBinder && objBinder !== this) {
            var binder = Reflect.getMetadata('binder', instance);
            return binder.bind(instance, data);
        }
        else {
            var d_1 = q.defer(), _ms_1 = modelState || new ModelState_1["default"]();
            this.validateObject(instance, data, _ms_1).then(function (dataObject) {
                return _this.bindObject(instance, dataObject, _ms_1);
            }).then(function () {
                d_1.resolve(_ms_1);
            }, function (err) {
                d_1.reject(err);
            }).done();
            return d_1.promise;
        }
    };
    /**
     * Tries to validate the given instance, if the model provides
     * a getSchema method. When validated, the returned promise resolves
     * a new data object which may contain transformed property values.
     *
     * @param instance The instance providing a schema.
     * @param data The data to validate.
     * @returns {Promise<any>}
     */
    ModelBinder.prototype.validateObject = function (instance, data, modelState) {
        data = data || {};
        var d = q.defer(), _ms = modelState || new ModelState_1["default"]();
        if (typeof instance['getSchema'] === 'function') {
            var schema = instance['getSchema']();
            joi.validate(data, schema, { abortEarly: false }, function (err, value) {
                if (err != null) {
                    _ms.add(err.details);
                }
                d.resolve(value);
            });
        }
        else {
            d.resolve(data);
        }
        return d.promise;
    };
    ModelBinder.prototype.bindObject = function (instance, data, modelState) {
        var _ms = modelState || new ModelState_1["default"](), bindingPromises = new Array();
        for (var _i = 0, _a = Object.getOwnPropertyNames(instance); _i < _a.length; _i++) {
            var propName = _a[_i];
            var prop = instance[propName];
            if (typeof prop === 'object') {
                bindingPromises.push(this.bind(instance[propName], data[propName], _ms));
            }
            else if (typeof prop !== 'function') {
                bindingPromises.push(this.bindProperty(instance, propName, data[propName]));
            }
        }
        return q.all(bindingPromises);
    };
    ModelBinder.prototype.bindProperty = function (instance, propName, value) {
        var propBinder = Reflect.getMetadata('binder', instance, propName);
        if (propBinder && propBinder !== this) {
            return propBinder.bindProperty(instance, propName, value);
        }
        else {
            var d = q.defer();
            instance[propName] = value;
            d.resolve();
            return d.promise;
        }
    };
    return ModelBinder;
}());
exports.__esModule = true;
exports["default"] = ModelBinder;
