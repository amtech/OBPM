import Repository from './Repository';
import ExecutionContext from '../viewmodels/ExecutionContext';
import * as q from 'q';
import Action from '../models/Action';
import db, {Database} from '../db';
import * as joi from 'joi';
import httpErr from '../routing/HttpError';
import * as extend from 'extend';
import ActionExecutor from './ActionExecutor';
let enjoi = require('enjoi');
import toQ from '../helpers/toq';

export default class ActionRespository extends Repository {

    protected get modelType(){
        return 'Action';
    }

    constructor(protected db: Database){
        super(db);
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
    public executeAction(context: ExecutionContext, user): q.Promise<any>{
        return this.getModel(context.actionId, true).then((action: Action) => {
            let executer = new ActionExecutor(context, action, user, this.db);
            return executer.execute();
        });
    }

    public findbyName(name: string){
        return this.db.single(`
            for action in Action
            filter action.name == "${name}"
            return action
        `);
    }

    /**
     * Returns an array of actions and meta information of executable actions for
     * the provided user.
     *
     * @method getExecutableActions
     *
     * @param {object} user user instance.
     *
     * @returns {q.Promise<any>}
     */
    public getExecutableActions(user): q.Promise<any> {
        return this.db.all(`
            for action in Action
                let actionDocs = obpm::getDocumentArray(action)
                let cases = (
                    for case in Document
                        filter case.type == 'Case' && action.createsNewCase != true
                        let caseDocs = (
                            for caseDoc in graph_traversal('documents',case._id,'outbound')
                                return caseDoc
                        )
                        let matches = (
                            for actionDoc in actionDocs
                                let matchingDocs = (
                                    for doc in caseDocs[0]
                                        filter actionDoc.type == doc.vertex.type &&
                                        actionDoc.state == doc.vertex.state &&
                                        doc.vertex.type != 'Case'
                                        return doc.vertex
                                )
                                filter !has(actionDoc, 'state') || length(matchingDocs) > 0
                                return {actionDoc, matchingDocs}
                        )
                        filter length(matches) == length(actionDocs)
                        return {
                            caseId: case._key, matches
                        }
                )
                filter length(cases) > 0 || action.createsNewCase == true
                return {
                    actionName: action.name, cases
                }
        `);
    }
}
