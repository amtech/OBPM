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
    public executeAction(context: ExecutionContext): q.Promise<any>{
        return this.getModel(context.actionId, true).then((action: Action) => {
            let executer = new ActionExecutor(context, action, this.db);
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
}
