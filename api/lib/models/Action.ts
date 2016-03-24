import IModel from './IModel';
import * as joi from 'joi';
import * as q from 'q';
import httpErr from '../routing/HttpError';
import ExecutionContext from './ExecutionContext';
import Document from './Document';
import schema from './ModelSchema';
import db from '../db';
let enjoi = require('enjoi');
let propPath = require('property-path');

export default class Action implements IModel{
    public id: string;
    public role: string;
    public state: string;
    public endState: string;
    public mapping: any;
    public dataSchema: any;
    public type: string;
    public documentType: string;
    public caseId: string;

    private _dataSchemaInstance: joi.ObjectSchema;
    public get dataSchemaInstance(): joi.ObjectSchema {
        return this._dataSchemaInstance ||
            <joi.ObjectSchema>(this._dataSchemaInstance = enjoi(this.dataSchema));
    }

    /**
     * Returns the schema for an action model instance.
     * @returns {ObjectSchema}
     */
    getSchema(): joi.ObjectSchema{
        return schema(Action).keys({
            id: joi.string().optional()
        });
    }

    /**
     * Validates the action data against the predefined data schema.
     * @param {any} data The action data to validate.
     * @returns {Promise<any>}
     */
    validateData(data: any): q.Promise<any>{
        let d = q.defer<any>();
        joi.validate(data, this.dataSchemaInstance, {abortEarly: false}, (err, value) => {
            if(err){
                d.reject(httpErr.validation(err.details));
            }else{
                d.resolve(value);
            }
        });

        return d.promise;
    }

    /**
     * Executes the action with the provided execution context.
     * @param {ExecutionContext} context
     * @returns {q.Promise<any>}
     */
    execute(context: ExecutionContext): q.Promise<any>{
        return this.validateData(context.data);
    }

    /**
     * Maps the provived action data to the underlying document instance.
     * @param {any} data The action data to map.
     * @param {Document} doc The document to map to.
     */
    mapData(data: any, doc: Document){
        for(let m of Object.getOwnPropertyNames(this.mapping)){
            propPath.set(doc.data, this.mapping[m], propPath.get(data, m));
        }
    }

    /**
     * Returns an action instance from the database.
     * @param {string} id The database id of the action.
     * @returns {Promise<Action>}
     */
    static get(id: string): q.Promise<Action>{
        return <q.Promise<Action>>db.getModel('Action', id);
    }
}

/**
 * Specialized Action type which execution creates a new document.
 */
export class CreateAction extends Action{

    execute(context: ExecutionContext): q.Promise<any>{
        return super.execute(context).then((data) => {
            let doc = new Document();
            doc.state = this.endState;
            doc.type = this.documentType;
            doc.state = this.caseId;
            this.mapData(data, doc);
        });
    }
}
