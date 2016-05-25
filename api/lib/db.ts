import * as q from 'q';
import httpErr from './routing/HttpError';
import IModel from './models/IModel';
import ModelBinder from './routing/ModelBinder';
import ModelState from './routing/ModelState';
import toQ from './helpers/toq';
import appConfig from './app-config';

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
let _defElements;
let getDefaultElements = () => {
    if (!_defElements) {
        _defElements = {
            default: {
                cols: ['Action', 'Document', 'DocumentType', 'Record'],
                edges: ['hasDocument', 'hasModel'],
                graphs: [{
                    name: 'documentTypes',
                    edgeDefinitions: [{
                        collection: 'hasModel',
                        from: ['DocumentType'],
                        to: ['DocumentType']
                    }]
                }, {
                    name: 'documents',
                    edgeDefinitions: [{
                        collection: 'hasDocument',
                        from: ['Document'],
                        to: ['Document']
                    }]
                }],
                docs: [],
                aql: [{
                    name: 'obpm::getDocumentArray',
                    code: function (action) {
                        var result=[];
                        for (var dName in action.documents) {
                            if (action.documents.hasOwnProperty(dName)) {
                                result.push(action.documents[dName]);
                            }
                        }
                        return result;
                    }
                }]
            }
        };
        _defElements[appConfig().authDatabase] = {
            cols: ['User', 'Client', 'AccessToken'],
            edges: [],
            graphs: [],
            docs: [{
                col: 'User',
                data: {
                    "userName": "admin",
                    "firstName": "admin",
                    "lastName": "admin",
                    "email": "admin@obpm",
                    "password": "pbkdf2$10000$1050c22e5a105bf4cdb3cb11ce81c05824169f39f25def2d723b2d672124082a7b1553473141007cd97540604ad20301a7beb26dc048f76c0672b5b458c2af52$1ab1682e645156807386af57550f31aaea29b693019060f7d8b57b323f67d383702d3d9480417cc5f0fc901d8d58c283400dd7ac6dd2c749bc5001969e99a0b3",
                    "roles": ["admin", "modeler", "teacher", "student"]
                }, after: (admin => {
                    return {
                        col: 'AccessToken',
                        data: {
                            "accessToken": "4ff50670866eb8d7f8ce10bf61e8ece6faeb56ac",
                            "clientId": "postman",
                            "expires": "2017-05-25T10:24:44.313Z",
                            "userId": admin._key
                        }
                    }
                })
            }, {
                col: 'Client',
                data: {
                    "id": "postman",
                    "secret": "postman_secret"
                }
            }, {
                col: 'Client',
                data: {
                    "id": "e2e-test-client",
                    "secret": "e2e-test-dg2343%.s79"
                }
            }],
            aql: []
        };
    }

    return _defElements;
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
        this.dbName = dbName;
    }

    public exists(): q.Promise<any> {
        let dbInst = arango();

        return toQ(dbInst.listDatabases()).then((names: Array<string>) => {
            return names.indexOf(this.dbName) >= 0;
        });
    }

    /**
     * Initializes the database context and creates a new database if it does not exist.
     * This method has to be called before using this database interface.
     * @returns {any}
     */
    public init(): q.Promise<any>{
        return this.exists().then(exists => {
            return exists ? true : toQ(arango().createDatabase(this.dbName));
        })
        .then((existed) => {
            this.conn = new arango.Database({databaseName : this.dbName});
            this.conn.useDatabase(this.dbName);

            return existed === true ? this : this.prepareDatabase();
        });
    }

    /**
     * Creates all default objects, such as collections, edge collections, graphs, etc.
     *
     * @method prepareDatabase
     *
     * @returns {q.Promise<any>}
     */
    private prepareDatabase(): q.Promise<any>{
        let defaults = getDefaultElements();
        let elems = defaults[this.dbName] || defaults.default;
        let ps = [];
        // collectins:
        ps = ps.concat(elems.cols.map(c => {
            return toQ(this.conn.collection(c).create());
        }));
        // edge collections:
        ps = ps.concat(elems.edges.map(c => {
            return toQ(this.conn.edgeCollection(c).create());
        }));

        return q.all(ps)
        .then(() => {
            ps = [];
            // graphs:
            ps = ps.concat(elems.graphs.map(g => {
                return toQ(this.conn.graph(g.name).create({
                    edgeDefinitions: g.edgeDefinitions
                }));
            }));
            // documents:
            ps = ps.concat(elems.docs.map(d => {
                return toQ(this.conn.collection(d.col).save(d.data)).then(nd => {
                    if (typeof d.after === 'function') {
                        let a = d.after(nd);
                        return toQ(this.conn.collection(a.col).save(a.data));
                    }
                });
            }));
            // AQL functions:
            ps = ps.concat(elems.aql.map(a => {
                return toQ(this.conn.createFunction(a.name, a.code.toString()));
            }));

            return q.all(ps);

        })
        .then(() => this);
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
                throw httpErr.notFound('Could not find a single resource.');
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
    public getModel(type: string, key: any): q.Promise<any>{
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

    public drop(): q.Promise<any> {
        return toQ<any>(arango().dropDatabase(this.dbName)
        .then(() => {
            delete _connections[this.dbName];
        }, err => {
            console.log('failed to delete ' + this.dbName);
            console.log(err);
        }));
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
export default function getDatabase(dbName: string, doNotInitialize?: boolean): q.Promise<any>{
    if (_connections[dbName]) {
        return q.fcall(() => { return _connections[dbName]; });
    } else {
        _connections[dbName] = new Database(dbName);
        return doNotInitialize ? q.fcall(() => { return _connections[dbName]; }) :
            _connections[dbName].init();
    }
}
