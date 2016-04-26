import Controller from './Controller';
import NewUser from '../viewmodels/NewUser';
import ActionModel from '../decorators/ActionModel';
import AuthRepository from '../repositories/AuthRepository';
import * as q from 'q';
import httpErr from '../routing/HttpError';
import * as actionResult from '../routing/ActionResult';
import db, {Database} from '../db';
import ControllerContext from './ControllerContext';


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
     * @param {object} $model
     *
     * @returns {q.Promise<any>} [description]
     */
    @ActionModel(NewUser, false)
    post($model: NewUser, $user): q.Promise<any> {
        return this.repo.createUser($model);
    }
}
