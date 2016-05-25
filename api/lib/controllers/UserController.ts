import Controller from './Controller';
import NewUser from '../viewmodels/NewUser';
import UpdateUser from '../viewmodels/UpdateUser';
import ActionModel from '../decorators/ActionModel';
import ActionAuth from '../decorators/ActionAuthorization';
import CtrlAuth from '../decorators/ControllerAuthorization';
import AuthRepository from '../repositories/AuthRepository';
import * as q from 'q';
import httpErr from '../routing/HttpError';
import * as actionResult from '../routing/ActionResult';
import db, {Database} from '../db';
import ControllerContext from './ControllerContext';
import UpdatePassword from '../viewmodels/UpdatePassword';
import IModel from '../models/IModel';
import * as joi from 'joi';


@CtrlAuth(['admin'])
export default class UserController extends Controller {

    protected repo: AuthRepository;

    constructor(){
        super();
    }

    public init(context: ControllerContext): q.Promise<any>{
        return super.init(context).then(() => {
            return AuthRepository.getRepo().then(repo => {
                this.repo = repo;
            });
        });
    }

    /**
     * Creates a new user
     *
     * @method post
     *
     * @param {NewUser} $model
     *
     * @returns {q.Promise<any>} [description]
     */
    @ActionModel(NewUser, false)
    post($model: NewUser, $user): q.Promise<any> {
        return this.repo.createUser($model);
    }

    @ActionModel(UpdateUser, false)
    put($model: UpdateUser, $id): q.Promise<any> {
        return this.repo.updateUser($model, $id);
    }

    delete($id): q.Promise<any> {
        return this.repo.removeModel($id);
    }

    /**
     * Changes the password of an existing user.
     *
     * @method changePassword
     *
     * @param {User} $user The current user instance.
     * @param {UpdatePasswordViewModel} $model The view model containing the
     * update information.
     *
     * @returns {q.Promise}
     */
    @ActionModel(UpdatePassword, false)
    @ActionAuth([])
    changepassword($user, $model: UpdatePassword) {
        return this.repo.updatePassword(
            $user,
            $model.userName,
            $model.oldPassword,$model.newPassword
        );
    }
}
