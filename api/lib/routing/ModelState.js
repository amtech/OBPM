"use strict";
var ModelState = (function () {
    function ModelState() {
        this._errors = [];
    }
    Object.defineProperty(ModelState.prototype, "errors", {
        get: function () {
            return this._errors;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ModelState.prototype, "isValid", {
        get: function () {
            return !this._errors.length;
        },
        enumerable: true,
        configurable: true
    });
    ModelState.prototype.add = function (param1, param2) {
        if (typeof param1 === 'object') {
            if (param1 instanceof Array) {
                this.addArray(param1);
            }
            else {
                this._errors.push(param1);
            }
        }
        else {
            this._errors.push({
                path: param1,
                message: param2,
                type: ''
            });
        }
    };
    ModelState.prototype.addArray = function (errors) {
        for (var _i = 0, errors_1 = errors; _i < errors_1.length; _i++) {
            var e = errors_1[_i];
            this.add(e);
        }
    };
    return ModelState;
}());
exports.__esModule = true;
exports["default"] = ModelState;
