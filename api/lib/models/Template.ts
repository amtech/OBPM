
import IModel from './IModel';
import * as joi from 'joi';

export default class Template implements IModel{
    getSchema(): joi.ObjectSchema{
        return joi.object();
    }
}
