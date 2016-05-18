import IModel from '../models/IModel';
import * as joi from 'joi';
import * as q from 'q';

export default class UpdateUser implements IModel{
    public userName: string;
    public email: string;
    public firstName: string;
    public lastName: string;
    public roles: string[];
    public _key: any;
    public _rev: any;
    public _id: any;

    getSchema(): joi.ObjectSchema{
        return joi.object({
            userName: joi.string().optional(),
            email: joi.string().email().optional(),
            firstName: joi.string().optional(),
            lastName: joi.string().optional(),
            _key: joi.any().optional(),
            _rev: joi.any().optional(),
            _id: joi.any().optional()
        });
    }
}
