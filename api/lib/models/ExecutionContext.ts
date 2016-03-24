import IModel from './IModel';
import * as joi from 'joi';
import * as q from 'q';

export default class ExecutionContext implements IModel{
    public documentId: string;
    public data: any;
    getSchema(): joi.ObjectSchema{
        return joi.object();
    }
}