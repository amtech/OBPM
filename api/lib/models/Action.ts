import IModel from './IModel';
import * as joi from 'joi';
import * as q from 'q';
import httpErr from '../routing/HttpError';
import ExecutionContext from '../viewmodels/ExecutionContext';
import Document from './Document';
import schema from './ModelSchema';
import db from '../db';
let enjoi = require('enjoi');
let propPath = require('property-path');

export default class Action implements IModel{
    public _key: string;
    public roles: Array<string>;
    public documents: any;

    /**
     * Returns the schema for an action model instance.
     * @returns {ObjectSchema}
     */
    getSchema(): joi.ObjectSchema{
        return schema(Action).keys({
            id: joi.string().optional()
        });
    }
}
