import RepositoryController from './RepositoryController';
import CaseRepository from '../repositories/CaseRepository';
import * as q from 'q';
import httpErr from '../routing/HttpError';
import * as actionResult from '../routing/ActionResult';
import Case from '../models/Case';

export default class CaseController extends RepositoryController<CaseRepository, Case> {
    constructor(){
        super(CaseRepository, Case);
    }

    getTree($id): q.Promise<any> {
        return actionResult.res(this.repo.getCaseTree($id));
    }
}
