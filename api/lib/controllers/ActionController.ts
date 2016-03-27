
import RepositoryController from './RepositoryController';
import ExecutionContext from '../viewmodels/ExecutionContext';
import ActionModel from '../decorators/ActionModel';
import ActionRespository from '../repositories/ActionRespository';
import * as q from 'q';

export default class ActionController extends RepositoryController<ActionRespository> {

    constructor(){
        super(ActionRespository);
    }

    public byName($params, $query): q.Promise<any>{
        return this.repo.findbyName($params['name'] || $query['name']);
    }

    /**
     * Executes an action by the provided execution context.
     *
     * @method execute
     *
     * @param {ExecutionContext} $model
     */
    @ActionModel(ExecutionContext, false)
    public execute($model: ExecutionContext): q.Promise<any> {
        return this.repo.executeAction($model);
    }
}
