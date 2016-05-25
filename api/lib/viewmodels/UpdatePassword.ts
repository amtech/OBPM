import IModel from '../models/IModel';
import * as joi from 'joi';
import * as q from 'q';

export default class UpdatePasswordViewModel implements IModel {

    public userName: string;
    public oldPassword: string;
    public newPassword: string;

    getSchema(): joi.ObjectSchema {
        return joi.object({
            userName: joi.string().required(),
            oldPassword: joi.string().required(),
            newPassword: joi.string().required()
        });
    }
}
