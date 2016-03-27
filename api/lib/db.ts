import * as q from 'q';
import httpErr from './routing/HttpError';
import IModel from './models/IModel';
import ModelBinder from './routing/ModelBinder';
import ModelState from './routing/ModelState';

let db = require('arangojs')(),
    aqlQuery = require('arangojs').aqlQuery;

/**
 * Provides basic functionality to access the database.
 */
export class Database{

    private _init: q.Promise<any>;

    /**
     * Creates a new database context.
     *
     * @constructor
     * @param {string} dbName The database name to connect to.
     */
    constructor(protected dbName: string, protected processId: string){
    }

    /**
     * Initializes the database context and creates a new database if it does not exist.
     * This method has to be called before using this database interface.
     * @returns {any}
     */
    public init(): q.Promise<any>{
        if(!this._init){
            let d = q.defer();
            db.useDatabase(this.dbName);
            this._init = d.promise;
            d.resolve();
        }

        return this._init
    }

    /**
     * Executes the specified query using aqlQuery.
     * @param {string} query The query to execute.
     * @param bindVars
     * @param opts
     * @returns {any}
     */
    public q(query, bindVars?, opts?): q.Promise<any>{
        let d = q.defer<any>();
        this.init().then(() => {
            db.query(query, bindVars, opts).then(result => {
                d.resolve(result);
            }, err => {
                d.reject(err);
            });
        }, err => {
            d.reject(err);
        });

        return d.promise;
    }

    public single(query, bindVars?, opts?): q.Promise<any>{
        return this.q(query, bindVars, opts).then(result => {
            return result.next();
        });
    }

    /**
     * Returns an instance of a database model:
     * 1. dynamically require model class
     * 2. retrieve model data from database
     * 3. use ModelBinder to bind data to model instance
     * @param {string} type Model type.
     * @param {string} id Model instance id.
     */
    public getModel(type: string, id: string): q.Promise<any>{
        return this.single(`
                for model in ${type}
                filter model._key == "${id}" && model.processId == "${this.processId}"
                return model
            `);
    }
}

export default function(processId: string, dbName?: string){
    return new Database(dbName || 'obpm', processId);
}
