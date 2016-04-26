import * as q from 'q';
import httpErr from './routing/HttpError';
import IModel from './models/IModel';
import ModelBinder from './routing/ModelBinder';
import ModelState from './routing/ModelState';
import toQ from './helpers/toq';

let arango = require('arangojs'),
    aqlQuery = require('arangojs').aqlQuery;
/**
 * global collection of cached connections per database name.
 *
 * @type {Object}
 */
let _connections = {};

/**
 * Object containing names of default collections per database names
 * wich should be created if they do not exist yet.
 *
 * @type {Object}
 */
let _defCollections = {
    default: ['Action', 'Document'],
    obpm_users: ['User', 'Client']
};

/**
 * Provides basic functionality to access the database.
 */
export class Database{

    protected conn: any;

    /**
     * Creates a new database context.
     *
     * @constructor
     * @param {string} dbName The database name to connect to.
     */
    constructor(protected dbName: string){
    }

    /**
     * Initializes the database context and creates a new database if it does not exist.
     * This method has to be called before using this database interface.
     * @returns {any}
     */
    public init(): Promise<any>{
        let dbInst = arango();

        return dbInst.listDatabases().then((names: Array<string>) => {
            if (names.indexOf(this.dbName) >= 0) {
                return true;
            } else {
                return dbInst.createDatabase(this.dbName);
            }
        }).then((existed) => {
            this.conn = new arango.Database({databaseName : this.dbName});
            this.conn.useDatabase(this.dbName);

            return existed === true ? this : this.prepareCollections();
        });
    }

    /**
     * Creates all default collections and resolved the promise as soon as
     * all collections are created.
     *
     * @method prepareCollections
     *
     * @returns {q.Promise<any>}
     */
    private prepareCollections(): q.Promise<any>{
        let cols = _defCollections[this.dbName] || _defCollections.default;
        return q.all(cols.map(c => {
            return toQ(this.conn.collection(c).create());
        })).then(() => this);
    }

    /**
     * Executes the specified query using aqlQuery.
     * @param {string} query The query to execute.
     * @param bindVars
     * @param opts
     * @returns {any}
     */
    public q(query, bindVars?, opts?): q.Promise<any>{
        return toQ(this.conn.query(query, bindVars, opts));
    }

    public collection(name: string): any{
        return this.conn.collection(name);
    }

    public edgeCollection(name: string): any{
        return this.conn.edgeCollection(name);
    }

    public graph(name: string): any{
        return this.conn.graph(name);
    }

    public single(query, throwIfNull?: boolean): q.Promise<any>{
        return this.q(query).then(result => {
            if(throwIfNull === true && !result.hasNext()) {
                throw new Error('Could not find a single resource.');
            }
            return toQ(result.next());
        });
    }

    public all(query: string): q.Promise<any> {
        return this.q(query).then(result => {
            return toQ(result.all());
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
    public getModel(type: string, key: string): q.Promise<any>{
        return this.single(`
            for model in ${type}
            filter model._key == "${key}"
            return model
        `);
    }

    public getModelById(id: string): q.Promise<any> {
        let ids = id.split('/');
        return this.getModel(ids[0], ids[1]);
    }
}

/**
 * Returns an existing or new database instance for the given DB name.
 *
 * @method getDatabase
 *
 * @param {string} dbName The name of the database.
 *
 * @returns {q.Promise<Database>} Promise resolving the database instance.
 */
export default function getDatabase(dbName: string): q.Promise<any>{
    if (_connections[dbName]) {
        return q.fcall(() => { return _connections[dbName]; });
    } else {
        _connections[dbName] = new Database(dbName);
        return toQ(_connections[dbName].init());
    }
}
