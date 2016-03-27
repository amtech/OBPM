"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var HttpErrorCode;
(function (HttpErrorCode) {
    HttpErrorCode[HttpErrorCode["NOT_FOUND"] = 404] = "NOT_FOUND";
    HttpErrorCode[HttpErrorCode["VALIDATION"] = 422] = "VALIDATION";
    HttpErrorCode[HttpErrorCode["SERVER"] = 500] = "SERVER";
    HttpErrorCode[HttpErrorCode["CLIENT"] = 400] = "CLIENT";
    HttpErrorCode[HttpErrorCode["NOT_IMPLEMENTED"] = 501] = "NOT_IMPLEMENTED";
})(HttpErrorCode || (HttpErrorCode = {}));
var HttpError = (function (_super) {
    __extends(HttpError, _super);
    function HttpError(httpCode, message, baseError) {
        message = message || (baseError ? baseError.message : 'An error occurred while processing the request');
        _super.call(this, message);
        this._httpCode = httpCode;
        if (baseError) {
            this.stack = baseError.stack;
            this._httpCode = baseError['httpCode'] || this._httpCode;
        }
    }
    Object.defineProperty(HttpError.prototype, "httpCode", {
        get: function () {
            return this._httpCode;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HttpError.prototype, "is404", {
        get: function () {
            return this._httpCode === HttpErrorCode.NOT_FOUND;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HttpError.prototype, "isValidationError", {
        get: function () {
            return this._httpCode === HttpErrorCode.VALIDATION;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HttpError.prototype, "isServerError", {
        get: function () {
            return this._httpCode === HttpErrorCode.SERVER;
        },
        enumerable: true,
        configurable: true
    });
    HttpError.validation = function (errors, message, baseErr) {
        return new HttpValidationError(errors, message, baseErr);
    };
    HttpError.server = function (param1, message) {
        var err, msg;
        if (param1 instanceof Error) {
            err = param1;
            msg = message;
        }
        else if (typeof param1 === 'string') {
            msg = param1;
        }
        return new HttpError(HttpErrorCode.SERVER, msg, err);
    };
    HttpError.notFound = function (message) {
        return new HttpError(HttpErrorCode.NOT_FOUND, (message || 'The requested ressource could not be found.'));
    };
    HttpError.execution = function (message) {
        return new HttpError(HttpErrorCode.CLIENT, (message || 'Invalid execution.'));
    };
    HttpError.notImplemented = function (message) {
        return new HttpError(HttpErrorCode.NOT_IMPLEMENTED, (message || 'Function or method not implemented.'));
    };
    return HttpError;
}(Error));
exports.__esModule = true;
exports["default"] = HttpError;
var HttpValidationError = (function (_super) {
    __extends(HttpValidationError, _super);
    function HttpValidationError(errors, message, baseErr) {
        _super.call(this, HttpErrorCode.VALIDATION, (message || 'one or more validation errors occurred'), baseErr);
        this._errors = errors;
    }
    Object.defineProperty(HttpValidationError.prototype, "errors", {
        get: function () {
            return this._errors;
        },
        enumerable: true,
        configurable: true
    });
    HttpValidationError.prototype.toString = function () {
        var str = this.message + ':\n';
        for (var _i = 0, _a = this.errors; _i < _a.length; _i++) {
            var err = _a[_i];
            str += err.path + " (" + err.type + "): " + err.message + "\n";
        }
        return str;
    };
    return HttpValidationError;
}(HttpError));
exports.HttpValidationError = HttpValidationError;
