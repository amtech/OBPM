import * as joi from 'joi';

enum HttpErrorCode{
    NOT_FOUND = 404,
    VALIDATION = 422,
    SERVER = 500,
    CLIENT = 400,
    NOT_IMPLEMENTED = 501,
    AUTH = 403
}

export default class HttpError extends Error{

    private _httpCode: number;
    public get httpCode(): number{
        return this._httpCode;
    }

    public _code: any;
    public get code(): any {
        return this._code;
    }

    constructor(httpCode: HttpErrorCode, code: any, message?: string, baseError?: Error){
        code = code || 'unknown_error';
        message = message || (baseError ? baseError.message : 'An error occurred while processing the request');
        super(message);
        this._httpCode = httpCode;
        this._code = code;

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

    get isAuthError(): boolean {
        return this._httpCode === HttpErrorCode.AUTH;
    }

    public static validation(errors: joi.ValidationErrorItem[], message?: string, baseErr?: Error): HttpValidationError{
        return new HttpValidationError(errors, message, baseErr);
    }

    public static  server(message?: string, code?: any): HttpError{
        return new HttpError(HttpErrorCode.SERVER, code, message);
    }

    public static notFound(message?: string, code?: any): HttpError{
        return new HttpError(
            HttpErrorCode.NOT_FOUND,
            code || 'not_found',
            (message || 'The requested ressource could not be found.'));
    }

    public static routeNotFound(message?: string, code?: any): HttpError{
        return new HttpRouteNotFoundError(code, message);
    }

    public static execution(message?: string, code?: any): HttpError{
        return new HttpError(HttpErrorCode.CLIENT,
            code || 'invalid_execution',
            (message || 'Invalid execution request.'));
    }

    public static notImplemented(message?: string, code?: any): HttpError{
        return new HttpError(HttpErrorCode.NOT_IMPLEMENTED,
            code || 'not_implemented',
            (message || 'Function or method not implemented.'));
    }

    public static auth(message?: string, code?: any): HttpError {
        return new HttpError(HttpErrorCode.AUTH,
            code || 'not_authorized',
            (message || 'You are not authrorized to execute this request.'));
    }
}

export class HttpRouteNotFoundError extends HttpError{
    constructor(code?: any, message?: string){
        super(HttpErrorCode.NOT_FOUND,
            code || 'route_not_found',
            message || 'The requested route not found.');
    }
}

export class HttpValidationError extends HttpError{
    private _errors: joi.ValidationErrorItem[];
    public get errors(): joi.ValidationErrorItem[]{
        return this._errors;
    }

    constructor(errors: joi.ValidationErrorItem[], message?: string, code?: any){
        super(HttpErrorCode.VALIDATION,
            code || 'validation_error',
            (message || 'one or more validation errors occurred.'));
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
