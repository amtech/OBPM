import * as joi from 'joi';

export default class ModelState{
    private _errors: joi.ValidationErrorItem[];

    constructor(){
        this._errors = [];
    }

    get errors(): joi.ValidationErrorItem[]{
        return this._errors;
    }

    get isValid(): boolean{
        return !this._errors.length;
    }

    public add(path: string, message: string);
    public add(error: joi.ValidationErrorItem): void;
    public add(errors: joi.ValidationErrorItem[]): void;
    public add(param1: string | joi.ValidationErrorItem | joi.ValidationErrorItem[], param2?: string): void{
        if(typeof param1 === 'object'){
            if(param1 instanceof Array){
                this.addArray(param1);
            }else{
                this._errors.push(<joi.ValidationErrorItem>param1);
            }
        }else{
            this._errors.push({
                path: <string>param1,
                message: param2,
                type: ''
            });
        }
    }

    private addArray(errors: joi.ValidationErrorItem[]): void{
        for(let e of errors){
            this.add(e);
        }
    }
}