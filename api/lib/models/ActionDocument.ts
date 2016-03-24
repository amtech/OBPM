import IModel from './IModel';
import * as joi from 'joi';
import Document from './Document';

export default class ActionDocument implements IModel{
    public document: Document;

    getSchema(): joi.ObjectSchema{
        return joi.object();
    }
}