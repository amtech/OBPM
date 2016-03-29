import Repository from './Repository';
import ExecutionContext from '../viewmodels/ExecutionContext';
import * as q from 'q';
import Action from '../models/Action';
import db, {Database} from '../db';
import * as joi from 'joi';
import httpErr from '../routing/HttpError';
import * as extend from 'extend';
let enjoi = require('enjoi');

export default class ActionRespository extends Repository {

    protected get modelType(){
        return 'Action';
    }

    /**
     * Executes the given action
     *
     * @method executeAction
     *
     * @param {string} actionId [description]
     * @param {ExecutionContext} context [description]
     *
     * @returns {[type]} [description]
     */
    public executeAction(context: ExecutionContext): q.Promise<any>{
        return this.getModel(context.actionId).then((action: Action) => {
            let executer = new ExecutingContext(context, action);
            return executer.execute();
        });
    }

    public findbyName(name: string){
        return this.db.single(`
            for action in Action
            filter action.name == "${name}" && action.processId == "${this.processId}"
            return action
        `);
    }
}

/**
 * Executes an action based on a given execution context.
 * This includes document queying, creating, data mapping and constraint handling.
 */
export class ExecutingContext{
    private db: Database

    constructor(
        private context: ExecutionContext,
        private action: Action){
        this.db = db('molena');
    }

    execute(): q.Promise<any>{
        return q.all(Object.getOwnPropertyNames(this.action.documents).map(d => {
            return this.mapData(d);
        })).then(docs => {
            let col = this.db.collection('Document');
            return q.all(docs.map((doc => {
                return doc._key ? col.replace(doc._key, doc) : col.save(doc);
            })));
        });
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
        if(actionDef.startState && !contextDoc.id){
            throw httpErr.execution('Expecting identifier for document ' + name);
        }

        return this.getDocument(actionDef.startState, contextDoc.id, actionDef.type)
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
    getDocument(state: string, key: string, type: string): q.Promise<any>{
        let d = q.defer();
        if(key){
            return this.db.q(`
                for doc in Document
                filter
                    doc._key == "${key}" &&
                    doc.state == "${state}" &&
                    doc.type == "${type}"
                return doc
            `);
        }
        d.resolve({type, data: {}});
        return d.promise;
    }
}
