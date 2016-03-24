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

    /**
     * Creates a new database context.
     *
     * @constructor
     * @param {string} dbName The database name to connect to.
     */
    constructor(public dbName: string){
    }

    /**
     * Initializes the database context and creates a new database if it does not exist.
     * This method has to be called before using this database interface.
     * @returns {any}
     */
    public init(): q.Promise<any>{
        return db.listDatabases()
            .then(names => {
                if(names.indexOf(this.dbName) < 0){
                    return db.createDatabase(this.dbName);
                }
            })
            .then(() => {
                db.useDatabase(this.dbName);
            });
    }

    /**
     * Executes the specified query using aqlQuery.
     * @param {string} query The query to execute.
     * @param bindVars
     * @param opts
     * @returns {any}
     */
    public q(query, bindVars?, opts?): Promise<any>{
        return db.query(aqlQuery(query), bindVars, opts);
    }

    /**
     * Returns an instance of a database model:
     * 1. dynamically require model class
     * 2. retrieve model data from database
     * 3. use ModelBinder to bind data to model instance
     * @param {string} type Model type.
     * @param {string} id Model instance id.
     */
    public getModel(type: string, id: string): q.Promise<IModel>{
        let d = q.defer<IModel>(),
            binder = new ModelBinder(),
            modelType = <{new(): any}>require('./models/' + type);
        if(!modelType){
            d.reject(httpErr.server(`Could not retrieve model type ${type}`));
            return d.promise;
        }

        let instance = new modelType();
        this.q(`
                for model in ${type}
                filter model.id == ${id}
                return model
            `)
            .then((modelData) => {
                return binder.bind(instance, modelData);
            })
            .then((modelState: ModelState) => {
                if(modelState.isValid){
                    d.resolve(instance);
                }else{
                    d.reject(httpErr.validation(modelState.errors));
                }
            });

        return d.promise;
    }
}

export default new Database('obpm');