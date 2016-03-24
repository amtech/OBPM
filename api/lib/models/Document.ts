import IModel from './IModel';
import * as joi from 'joi';
import * as q from 'q';

export default class Document implements IModel{
    getSchema(): joi.ObjectSchema{
        return joi.object().keys({
            state: joi.string().required(),
            data: joi.object().required()
        });
    }

    constructor(){
        this.data = {};
    }

    public state: string;
    public data: any;
    public type: string;
    public caseId: string;
}