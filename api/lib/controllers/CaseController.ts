import RepositoryController from './RepositoryController';
import CaseRepository from '../repositories/CaseRepository';
import * as q from 'q';
import httpErr from '../routing/HttpError';
import * as actionResult from '../routing/ActionResult';


export default class CaseController extends RepositoryController<CaseRepository> {
    constructor(){
        super(CaseRepository);
    }

    get($id): q.Promise<any> {
        return actionResult.res(this.repo.getCaseTree($id));
    }
}
