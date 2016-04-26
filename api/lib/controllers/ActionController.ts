
import RepositoryController from './RepositoryController';
import ExecutionContext from '../viewmodels/ExecutionContext';
import ActionModel from '../decorators/ActionModel';
import ActionAuth from '../decorators/ActionAuthorization';
import ActionRespository from '../repositories/ActionRespository';
import * as q from 'q';
import httpErr from '../routing/HttpError';
import * as actionResult from '../routing/ActionResult';


export default class ActionController extends RepositoryController<ActionRespository> {

    constructor(){
        super(ActionRespository);
    }

    public byName($params, $query): q.Promise<any>{
        return actionResult.res(
            this.repo.findbyName($params['name'] || $query['name'])
        );
    }

    /**
     * Executes an action by the provided execution context.
     *
     * @method execute
     *
     * @param {ExecutionContext} $model
     */
    @ActionModel(ExecutionContext, false)
    public execute($model: ExecutionContext, $user): q.Promise<any> {
        return this.repo.executeAction($model, $user);
    }

    @ActionAuth(['admin'])
    public executables($user): q.Promise<any> {
        return this.repo.getExecutableActions($user);
    }
}
