import Repository from './Repository';
import CaseRepository, {ObjectTree} from './CaseRepository';
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

    protected caseRepo: CaseRepository;

    constructor(protected db: Database){
        super(db);
        this.caseRepo = new CaseRepository(db);
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
        return this.getActionCases()
        .then((actions: any[]) => {
            return q.all(actions.map(r => this.filterByUser(r, user)))
            .then((result: any[]) => {
                let actionResults = [];
                for (let i = 0; i < result.length; i++) {
                    if (result[i] === true && !actions[i].cases) {
                        actionResults.push(actions[i]);
                    } else if(result[i].length > 0) {
                        actions[i].cases = result[i];
                        actionResults.push(actions[i]);
                    }
                }

                return actionResults;
            });
        });
    }

    protected filterByUser(action, user): q.Promise<any> {
        if (!action.cases) {
            return q.fcall(() => {
                return ActionExecutor.isExecutableByUser(action, user);
            });
        }

        return q.all(action.cases.map(c => this.caseRepo.getCaseTree(c.caseId)))
        .then((trees: ObjectTree[])  => {
            let validCases = []
            for (let i = 0; i < trees.length; i++) {
                if(ActionExecutor.isExecutableByUser(action, user, trees[i])) {
                    validCases.push(action.cases[i]);
                }
            }
            return validCases;
        });
    }

    protected getActionCases(): q.Promise<any> {
        var promises = [];

        // get actions which are case independent:
        promises.push(this.db.all(`
            for action in Action
            let actionDocs = obpm::getDocumentArray(action)
            filter action.createsNewCase == true
            let matches = (
                for actionDoc in actionDocs
                    return { actionDoc: actionDoc, matchingDocs: [] }
            )
            return {
                actionName: action.name, roles: action.roles, matches: matches
            }
        `));

        // Get actions and their cases:
        promises.push(this.db.all(`
            for action in Action
                filter action.createsNewCase != true
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
                                        doc.vertex.state IN actionDoc.state &&
                                        doc.vertex.type != 'Case'
                                        return doc.vertex._key
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
                    actionName: action.name, roles: action.roles, cases
                }
        `));

        // concat and return results:
        return q.all(promises).then(result => {
            let concat = [];
            for(let arr of result) {
                concat = concat.concat(arr);
            }

            return concat;
        });
    }
}
