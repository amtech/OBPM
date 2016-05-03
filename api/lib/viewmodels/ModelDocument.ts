import IModel from '../models/IModel';
import * as joi from 'joi';

export default class ModelDocument implements IModel {

    public type: string;
    public parent: number;
    public max: number;


    getSchema(): joi.ObjectSchema {
        return joi.object({
            type: joi.string().required(),
            parent: joi.number().required(),
            max: joi.number().optional()
        });
    }
}
