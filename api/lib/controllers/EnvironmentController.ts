import * as q from 'q';
import Controller from './Controller';
import EnvironmentRepository from '../repositories/EnvironmentRepository';
import ControllerContext from './ControllerContext';
import db, {Database} from '../db';
import CtrlAuth from '../decorators/ControllerAuthorization';

@CtrlAuth(['modeler', 'admin'])
export default class EnvironmentController extends Controller {

    protected repo: EnvironmentRepository;

    public init(context: ControllerContext): q.Promise<any>{
        return super.init(context).then(() => {
            return db(context.request.params['tid']).then(database => {
                this.repo = new EnvironmentRepository(database);
            });
        });
    }

    public delete() {
        return this.repo.deleteProcess();
    }
}
