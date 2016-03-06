import * as joi from 'joi';

enum HttpErrorCode{
    NOT_FOUND = 404,
    VALIDATION = 422,
    SERVER = 500
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
    get isValidationError(): boolean{
        return this._httpCode === HttpErrorCode.VALIDATION;
    }
    get isServerError(): boolean{
        return this._httpCode === HttpErrorCode.SERVER;
    }

    public static validation(errors: joi.ValidationErrorItem[], message?: string, baseErr?: Error): HttpValidationError{
        return new HttpValidationError(errors, message, baseErr);
    }

    public static  server(baseErr?: Error, message?: string): HttpError{
        return new HttpError(HttpErrorCode.SERVER, message, baseErr);
    }

    public static notFound(message?: string){
        return new HttpError(HttpErrorCode.NOT_FOUND, (message || 'The requested ressource could not be found.'));
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
}