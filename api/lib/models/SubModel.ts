import IModel from './IModel';
import * as joi from 'joi';

export default class SubModel implements IModel{

    public street: string;
    public streetNumber: string;
    public zipCode: number;
    public city: string;

    getSchema(): joi.ObjectSchema{
        return joi.object().keys({
            street: joi.string().required(),
            streetNumber: joi.number().integer(),
            zipCode: joi.number().integer().min(1000).max(9999).required(),
            city: joi.string().required()
        });
    }
}