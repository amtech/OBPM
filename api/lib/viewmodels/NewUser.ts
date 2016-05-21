import IModel from '../models/IModel';
import * as joi from 'joi';
import * as q from 'q';

export default class NewUser implements IModel{
    public userName: string;
    public password: string;
    public email: string;
    public firstName: string;
    public lastName: string;
    public roles: string[];

    getSchema(): joi.ObjectSchema{
        return joi.object({
            userName: joi.string().required(),
            password: joi.string().required(),
            email: joi.string().email().required(),
            firstName: joi.string().required(),
            lastName: joi.string().required(),
            roles: joi.array().items(joi.string()).required()
        });
    }
}
