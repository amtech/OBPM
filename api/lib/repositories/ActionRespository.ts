import Repository from './Repository';
import ExecutionContext from '../viewmodels/ExecutionContext';
import * as q from 'q';
import Action from '../models/Action';

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
        return q.defer().promise;
    }


    public findbyName(name: string){
        return this.db.single(`
            for action in Action
            filter action.name == "${name}" && action.processId == "${this.processId}"
            return action
        `);
    }
}
