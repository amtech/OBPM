import * as joi from 'joi';

enum HttpErrorCode{
    NOT_FOUND = 404,
    VALIDATION = 422,
    SERVER = 500,
    CLIENT = 400,
    NOT_IMPLEMENTED = 501
}

export default class HttpError extends Error{

    private _httpCode: number;
    public get httpCode(): number{
        return this._httpCode;
    }

    constructor(httpCode: number | HttpErrorCode, message?: string, baseError?: Error){
        message = message || (baseError ? baseError.message : 'An error occurred while processing the request');
        super(message);
        this._httpCode = httpCode;

        if(baseError){
            this.stack = baseError.stack;
            this._httpCode = baseError['httpCode'] || this._httpCode;
        }
    }

    get is404(): boolean{
        return this._httpCode === HttpErrorCode.NOT_FOUND;
    }
    get isRouteNotFound(): boolean{
        return this instanceof HttpRouteNotFoundError;
    }
    get isValidationError(): boolean{
        return this._httpCode === HttpErrorCode.VALIDATION;
    }
    get isServerError(): boolean{
        return this._httpCode === HttpErrorCode.SERVER;
    }

    public static validation(errors: joi.ValidationErrorItem[], message?: string, baseErr?: Error): HttpValidationError{
        return new HttpValidationError(errors, message, baseErr);
    }

    public static  server(): HttpError;
    public static  server(baseErr: Error): HttpError;
    public static  server(message: string): HttpError;
    public static  server(param1?: Error | string, message?: string): HttpError{
        let err: Error,
            msg: string;
        if(param1 instanceof Error){
            err = param1;
            msg = message;
        } else if(typeof param1 === 'string'){
            msg = param1;
        }
        return new HttpError(HttpErrorCode.SERVER, msg, err);
    }

    public static notFound(message?: string): HttpError{
        return new HttpError(HttpErrorCode.NOT_FOUND, (message || 'The requested ressource could not be found.'));
    }

    public static routeNotFound(message?: string): HttpError{
        return new HttpRouteNotFoundError(message);
    }

    public static execution(message?: string): HttpError{
        return new HttpError(HttpErrorCode.CLIENT, (message || 'Invalid execution.'));
    }

    public static notImplemented(message?: string): HttpError{
        return new HttpError(HttpErrorCode.NOT_IMPLEMENTED, (message || 'Function or method not implemented.'));
    }
}

export class HttpRouteNotFoundError extends HttpError{
    constructor(message?: string){
        super(HttpErrorCode.NOT_FOUND, message || 'Route not found.');
    }
}

export class HttpValidationError extends HttpError{
    private _errors: joi.ValidationErrorItem[];
    public get errors(): joi.ValidationErrorItem[]{
        return this._errors;
    }

    constructor(errors: joi.ValidationErrorItem[], message?: string, baseErr?: Error){
        super(HttpErrorCode.VALIDATION, (message || 'one or more validation errors occurred'), baseErr);
        this._errors = errors;
    }

    toString(): string{
        let str = this.message + ':\n';
        for(let err of this.errors){
            str += `${err.path} (${err.type}): ${err.message}\n`;
        }

        return str;
    }
}
