import * as joi from 'joi';

interface IModel{
    getSchema(): joi.ObjectSchema;
}

export default IModel;
