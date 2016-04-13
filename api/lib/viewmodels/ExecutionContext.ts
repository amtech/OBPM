import IModel from '../models/IModel';
import * as joi from 'joi';
import * as q from 'q';

export class ExecutionContextDocument {
    id: string;
    data: any;
}

export default class ExecutionContext implements IModel{
    actionId: string;
    caseId: string;
    documents: any;

    getSchema(): joi.ObjectSchema{
        return joi.object({
            actionId: joi.string().required(),
            caseId: joi.string().optional(),
            documents: joi.object().pattern(/\w/, joi.object({
                id: joi.string().optional(),
                data: joi.object().optional()
            }))
        });
    }
}
