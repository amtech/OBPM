import Repository from './Repository';
import {Database} from '../db';
import * as q from 'q';

export default class RecordRepository extends Repository {
    protected get modelType(){
        return 'Record';
    }
}
