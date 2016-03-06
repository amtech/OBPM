import IModel from './IModel';
import * as joi from 'joi';
import SubModel from './SubModel';

export default class Action implements IModel{
    constructor(){
        this.address = new SubModel();
    }

    public firstName: string;
    public lastName: string;
    public email: string;
    public address: SubModel;

    getSchema(): joi.ObjectSchema {
        return joi.object().keys({
            firstName: joi.string().required().max(30).alphanum(),
            lastName: joi.string().required().max(30).alphanum(),
            email: joi.string().email(),
            address: joi.object().required()
        });
    }
}