import db, {Database} from '../db';
import ExecutionContext from '../models/Execution';
import Action from '../models/Action';
import * as q from 'q';
let enjoi = require('enjoi');
import * as joi from 'joi';
import httpErr from '../routing/HttpError';
import * as extend from 'extend';
import CaseRepository, {ObjectTree} from './CaseRepository';
import RecordRepository from './RecordRepository';
import toQ from '../helpers/toq';
import * as objectPath from 'object-path';

/**
 * Executes an action based on a given execution context.
 * This includes document queying, creating, data mapping and constraint handling.
 * Thsi executer also updates the document records accordingly.
 */
export default class ActionExecutor{

    private caseRepo: CaseRepository;
    private recordRepo: RecordRepository;
    private internalActions: InternalActions;
    private isExecuted: boolean;
    private caseInstance: ObjectTree;
    private newEdges: any;

    constructor(
        private context: ExecutionContext,
        private action: Action,
        private user,
        private db: Database){
        this.caseRepo = new CaseRepository(this.db);
        this.recordRepo = new RecordRepository(this.db);
        this.internalActions = new InternalActions(this.db, this.context);
        this.newEdges = [];
    }

    /**
     * Returns if the current action is executable by the current user.
     *
     * @method isExecutableByUser
     *
     * @param {ObjectTree} caseInstance Current document structure tree.
     *
     * @returns {boolean}
     */
    public static isExecutableByUser(action: Action, user, caseInstance?: ObjectTree): boolean {
        let uRoles = user.roles;
        if (!uRoles || !uRoles.length) return false;
        let resolved = !caseInstance ? action.roles : action.roles.map(r => {
            return caseInstance.resolveVar(r);
        })
        // check user:
        if (resolved.indexOf(user.userName) >= 0) {
            return true;
        }

        // check roles:
        for (let aRole of resolved) {
            if (aRole && uRoles.indexOf(aRole) >= 0) {
                return true;
            }
        }

        return false;
    }

    /**
     * Executes the current wrapped action.
     *
     * @method execute
     *
     * @returns {q.Promise<any>}
     */
    execute(): q.Promise<any>{
        if(this.isExecuted) throw httpErr.server('ActionExecuter already executed.', 'already_executed');
        this.isExecuted = true;

        return this.getCaseKey()
        // get case
        .then(key => this.caseRepo.getCaseTree(key))
        // validate execution and map data to docs:
        .then(c => {
            if(c) {this.caseInstance = c }
            else if(!this.caseInstance) { throw httpErr.execution('Invalid case ID.', 'invalid_case'); }

            if(!ActionExecutor.isExecutableByUser(this.action, this.user, this.caseInstance)) {
                throw httpErr.auth('Not permitted to execute this action.');
            }

            return q.all(Object.getOwnPropertyNames(this.action.documents).map(d => {
                return this.mapData(d);
            }));
        })
        // save or update mapped docs:
        .then(docs => {
            let col = this.db.collection('Document');
            return q.all(docs.map((doc => {
                let dbDoc = this.stripDocument(doc);
                return dbDoc._key ? col.replace(dbDoc._key, dbDoc) : col.save(dbDoc).then(res => {
                    doc._id = res._id;
                    doc._key = res._key;
                    doc._rev = res._rev;
                });
            })))
            .then(() => {
                return docs;
            });
        })
        // create record for each doc:
        .then(docs => {
            let col = this.db.collection('Record');
            // Only create a record for manipulated docs:
            return q.all(docs.map((d: any) => {
                let startState = d.__origState;
                return this.recordRepo.createRecord(this.user, this.action, {
                    key: d._key,
                    type: d.type,
                    oldState: d.__origState,
                    newState: d.state,
                    data: d.__mappedData
                });
            }))
            .then(() => {
                return docs;
            });
        })
        // create new edge documents for newly created docs:
        .then((docs) => {
            if(!this.newEdges.length) return;

            let edgeCol = this.db.edgeCollection('hasDocument');
            return q.all(this.newEdges.map(ed => {
                return edgeCol.save(ed.data, ed.from._id, ed.to._id);
            }))
            .then(() => {
                return docs.map(d => this.stripDocument(d));
            });
        });
    }

    /**
     * Returns a new document obejct only containing valid attributes.
     *
     * @method stripDocument
     *
     * @param {any} doc The original document to strip down.
     *
     * @returns {any} New document instance.
     */
    private stripDocument(doc: any): any {
        return {
            _id: doc._id,
            _key: doc._key,
            _rev: doc._rev,
            state: doc.state,
            data: doc.data,
            type: doc.type
        };
    }

    /**
     * Returns either a provided case Key or the id of a new created case.
     *
     * @method getCaseKey
     *
     * @returns {q.Promise<any>} resolving the case Key.
     */
    getCaseKey(): q.Promise<any>{
        if(!this.action.createsNewCase) {
            if(this.context.caseId){
                return q.fcall(() => this.context.caseId);
            }
            throw httpErr.execution('This execution requires a valid case ID.', 'missing_case');
        }
        return this.internalActions.createCase().then(c => {
            this.caseInstance = c;
            return c.root._key;
        });
    }

    /**
     * Validates and maps incoming data to a document attached by the given name.
     *
     * @method mapData
     *
     * @param {string} name The name under which the document is attached to the action.
     *
     * @returns {q.Promise<any>}
     */
    mapData(name: string): q.Promise<any>{
        return this.getDocInfo(name).then(docInfo => {
            let execData = docInfo.contextDoc.data,
                docData = docInfo.doc.data,
                schema = docInfo.actionDef.schema;

            if(execData && schema){
                let joiSchema = <joi.ObjectSchema>enjoi(schema),
                    validation = joi.validate(execData, joiSchema, {abortEarly: false});
                if(validation.error){
                    throw httpErr.validation(
                        validation.error.details,
                        `Validaton errors in document ${docInfo.name}`
                    )
                }
            }

            if(execData) {
                extend(true, docData, execData);
            }
            // cache original state and data for the records.
            docInfo.doc.__origState = docInfo.doc.state;
            docInfo.doc.__mappedData = execData;

            let newState = docInfo.actionDef.endState || docInfo.actionDef.state;
            if(newState instanceof Array) newState = newState[0];
            if(!newState) {
                throw httpErr.execution('Expecting an end state but either endState nor state wa defined.', 'missing_state');
            }
            docInfo.doc.state = newState;
            return docInfo.doc;
        });
    }

    /**
     * Validates the context and returns a promise resolving an object containing
     * the execution context doc, action definition doc and the database document.
     *
     * @method getDocInfo
     *
     * @param {string} name The name under which the document is attached to the action.
     *
     * @returns {q.Promise<any>}
     */
    getDocInfo(name: string): q.Promise<any>{
        let contextDoc = this.context.documents[name],
            actionDef = this.action.documents[name];
        if(!contextDoc) throw httpErr.execution(`Missing document ${name}.`, 'missing_doc');

        // Action expects existing doc but no key was provided:
        if(actionDef.state && !contextDoc.id)
            throw httpErr.execution('Expecting identifier for document ' + name, 'missing_identifier');

        return this.getDocument(actionDef, contextDoc)
            .then(doc => {
                if(!doc) throw httpErr.execution(
                    `Provided ${name} is not in state ${actionDef.state}`
                , 'wrong_state');

                return {contextDoc, actionDef, doc, name};
            });
    }

    /**
     * Returns an existing or an new document based on the provided state and key.
     * If a key is provided, a document query is returned which may resolve null.
     *
     * @method getDocument
     *
     * @param {string} state [description]
     * @param {string} key [description]
     * @param {string} type [description]
     *
     * @returns {q.Promise<any>} [description]
     */
    getDocument(actionDef: any, contextDoc: any): q.Promise<any>{
        let key = contextDoc.id,
            type = actionDef.type;
        if (key) {
            return q.fcall(() => {
                let eDoc = this.caseInstance.documents['Document/' + key];
                if(eDoc.type === type && actionDef.state.indexOf(eDoc.state) >= 0) return eDoc;
                return;
            });
        } else {
            return this.caseRepo.getModelTree().then(tree => {
                let model = tree.getValue(actionDef.path);

                if (!model) throw httpErr.execution('Invalid document path definied in Action.', 'invalid_path');
                if(model.type !== type) throw httpErr.execution('Invalid document type definied in Action.', 'invalid_type');

                let siblings = this.caseInstance.getValue(actionDef.path),
                    sArr = siblings instanceof Array ? siblings : siblings ? [siblings] : [];

                if(model.__max && model.__max <= sArr.length) {
                    throw httpErr.execution('Already maximum documents of this type attached to parent.', 'invalid_child');
                }

                let paths = actionDef.path.split('.');
                let parentPath = paths.slice(0, -1).join('.');
                let parent = parentPath.length ? this.caseInstance.getValue(parentPath) :
                    this.caseInstance.root;
                if (!parent) throw httpErr.execution('Invalid document path definied in Action.', 'invalid_path');

                let newDoc = { type, data: {} };
                this.newEdges.push({
                    from: parent,
                    to: newDoc,
                    data: {
                        property: paths[paths.length - 1],
                        max: model.__max
                    }
                });

                return newDoc;
            });
        }
    }
}

export class InternalActions {

    private caseRepo: CaseRepository;

    constructor(private db: Database, private context: ExecutionContext) {
        this.caseRepo = new CaseRepository(this.db);
    }

    createCase(): q.Promise<any>{
        let col = this.db.collection('Document');
         return toQ(col.save({
             type: 'Case',
             state: 'created',
             data: {}
         })).then(newCase => {
             newCase['__documents'] = {};
             return new ObjectTree(newCase);
         });
    }
}
