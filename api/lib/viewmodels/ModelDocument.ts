import IModel from '../models/IModel';
import * as joi from 'joi';

export default class ModelDocument implements IModel {

    public type: string;
    public parent: any;
    public max: number;
    public property: string;


    getSchema(): joi.ObjectSchema {
        return joi.object({
            type: joi.string().required(),
            parent: joi.any().optional(),
            max: joi.number().optional(),
            property: joi.string().optional()
        });
    }
}
