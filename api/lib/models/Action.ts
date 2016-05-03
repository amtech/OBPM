import IModel from './IModel';
import * as joi from 'joi';

export default class Action implements IModel{
    public _key: string;
    public roles: Array<string>;
    public documents: any;
    public createsNewCase: boolean;

    /**
     * Returns the schema for an action model instance.
     * @returns {ObjectSchema}
     */
    getSchema(): joi.ObjectSchema{
        return joi.object({
            name: joi.string().required(),
            createsNewCase: joi.boolean().required()
        });
    }
}
