
import RepositoryController from './RepositoryController';
import Action from '../models/Action';
import ActionModel from '../decorators/ActionModel';
import ActionAuth from '../decorators/ActionAuthorization';
import CtrlAuth from '../decorators/ControllerAuthorization';
import ActionRespository from '../repositories/ActionRespository';
import * as q from 'q';
import httpErr from '../routing/HttpError';
import * as actionResult from '../routing/ActionResult';

@CtrlAuth(['modeler'])
export default class ActionController extends RepositoryController<ActionRespository> {

    constructor(){
        super(ActionRespository, Action);
    }

    @ActionAuth([])
    public byName($params, $query): q.Promise<any>{
        return actionResult.res(
            this.repo.findbyName($params['name'] || $query['name'])
        );
    }

    @ActionAuth([])
    public executables($user): q.Promise<any> {
        return this.repo.getExecutableActions($user);
    }

    public get($id): q.Promise<any> {
        return super.get($id);
    }

    public put($id, $model) {
        return super.put($id, $model);
    }

    public post($model): q.Promise<any> {
        return super.post($model);
    }

    public delete($id): q.Promise<any> {
        return super.delete($id);
    }
}
