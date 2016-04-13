import db, {Database} from '../db';
import ExecutionContext from '../viewmodels/ExecutionContext';
import Action from '../models/Action';
import * as q from 'q';
let enjoi = require('enjoi');
import * as joi from 'joi';
import httpErr from '../routing/HttpError';
import * as extend from 'extend';
import CaseRepository from './CaseRepository';
import toQ from '../helpers/toq';
import * as objectPath from 'object-path';

/**
 * Executes an action based on a given execution context.
 * This includes document queying, creating, data mapping and constraint handling.
 */
export default class ActionExecutor{

    private caseRepo: CaseRepository;
    private internalActions: InternalActions;
    private isExecuted: boolean;
    private caseInstance: any;
    private newEdges: any;

    constructor(
        private context: ExecutionContext,
        private action: Action,
        private db: Database){
        this.caseRepo = new CaseRepository(this.db);
        this.internalActions = new InternalActions(this.db, this.context);
    }

    execute(): q.Promise<any>{
        if(this.isExecuted) throw httpErr.server('ActionExecuter already executed.');
        this.isExecuted = true;
        return this.getCaseKey()
        .then(key => this.caseRepo.getCaseTree(key))
        .then(c => {
            this.caseInstance = c;
            return q.all(Object.getOwnPropertyNames(this.action.documents).map(d => {
                return this.mapData(d);
            }));
        })
        .then(docs => {
            let col = this.db.collection('Document');
            return q.all(docs.map((doc => {
                return doc._key ? col.replace(doc._key, doc) : col.save(doc).then(res => {
                    doc._id = res._id;
                });
            })));
        })
        .then(() => {
            if(!this.newEdges.length) return;

            let edgeCol = this.db.edgeCollection('hasDocument');
            return q.all(this.newEdges.map(ed => {
                return edgeCol.save(ed.data, ed.from._id, ed.to._id);
            }));
        });
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
            throw httpErr.execution('This execution requires a valid case ID.');
        }
        return this.internalActions.createCase().then(c => c._key);
    }

    mapData(name: string): q.Promise<any>{
        return this.getDocInfo(name).then(docInfo => {
            let execData = docInfo.contextDoc.data,
                docData = docInfo.doc.data,
                schema = docInfo.actionDef.schema;

            if(schema){
                let joiSchema = <joi.ObjectSchema>enjoi(schema),
                    validation = joi.validate(execData, joiSchema, {abortEarly: false});
                if(validation.error){
                    throw httpErr.validation(
                        validation.error.details,
                        `Validaton errors in document ${docInfo.name}`
                    )
                }
            }

            extend(true, docData, execData);
            docInfo.doc.state = docInfo.actionDef.endState;
            return docInfo.doc;
        });
    }

    getDocInfo(name: string): q.Promise<any>{
        let contextDoc = this.context.documents[name],
            actionDef = this.action.documents[name];
        if(!contextDoc) throw new Error(`Missing document ${name}.`);

        // Action expects existing doc but no key was provided:
        if(actionDef.startState && !contextDoc.id)
            throw httpErr.execution('Expecting identifier for document ' + name);

        return this.getDocument(actionDef, contextDoc)
            .then(doc => {
                if(!doc) throw new Error(
                    `Could not find ${name} in state ${actionDef.startState}`
                );

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
            type = actionDef.type,
            state = actionDef.state;
        if (key) {
            return q.fcall(() => this.caseInstance.__documents['Document/' + key]);
        } else {
            return this.caseRepo.getModelTree().then(root => {
                let model = <any>objectPath.get(root, actionDef.path);

                if (!model) throw httpErr.execution('Invalid document path definied in Action.');
                if(model.type !== type) httpErr.execution('Invalid document type definied in Action.');

                let siblings = objectPath.get(this.caseInstance, actionDef.path),
                    sArr = <any[]>(siblings instanceof Array ? siblings : [siblings]);

                if(model.__max && model.__max <= sArr.length) {
                    httpErr.execution('Already maximum documents of this type attached to parent.');
                }

                let paths = actionDef.path.split('.');
                let parentPath = paths.slice(0, -1).join('.');
                let parent = parentPath.length ? objectPath.get(this.caseInstance) :
                    this.caseInstance;
                if (!parent) throw httpErr.execution('Invalid document path definied in Action.');

                let newDoc = {type, data: {}};
                this.newEdges.push({
                    from: parent,
                    to: newDoc,
                    data: {
                        property: paths[paths.length - 1],
                        max: model.__max,
                        min: model.__min
                    }
                });
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
         }));
    }
}
