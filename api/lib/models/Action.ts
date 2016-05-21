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
            createsNewCase: joi.boolean().optional(),
            roles: joi.array().items(joi.string()).required(),
            documents: joi.object().required().unknown(true)
            .pattern(/\w\d/, joi.object({
                type: joi.string().required(),
                path: joi.string().optional(),
                endState: joi.string().optional(),
                schema: joi.object().optional(),
                state: joi.array().items(joi.string()).optional()
            })
            .or('state', 'endState')
            .xor('state', 'path'))
        });
    }
}
