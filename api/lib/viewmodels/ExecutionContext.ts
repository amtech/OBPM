import IModel from '../models/IModel';
import * as joi from 'joi';
import * as q from 'q';

export class ExecutionContextDocument{
    type: string;
    id: string;
    data: any;
}

export default class ExecutionContext implements IModel{
    actionName: string;
    documents: Array<ExecutionContextDocument>;

    getSchema(): joi.ObjectSchema{
        return joi.object({
            actionName: joi.string().required(),
            documents: joi.array().required().items(
                joi.object({
                    type: joi.string(),
                    id: joi.string(),
                    data: joi.object()
                }).or('type', 'id')
            )
        });
    }
}
