import IModel from './IModel';
import * as joi from 'joi';

export default class Case implements IModel{
    public name: string;

    /**
     * Returns the schema for an action model instance.
     * @returns {ObjectSchema}
     */
    getSchema(): joi.ObjectSchema{
        return joi.object({
            name: joi.string().required()
        });
    }
}
