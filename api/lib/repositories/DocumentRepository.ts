import Repository from './Repository';
import {Database} from '../db';

export default class DocumentRepository extends Repository{
    constructor(db: Database) {
        super(db);
    }

    protected get modelType(): string {
        return 'Document';
    }
}
