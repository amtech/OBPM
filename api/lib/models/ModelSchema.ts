import * as joi from 'joi';
import IModel from './IModel';

export interface IModelSchema extends joi.ObjectSchema{
    getModelType(): { new(): IModel };
}

export default function modelSchema(type: Function): IModelSchema{
    let obj = joi.object();
    obj['__modelType'] = type;
    obj['getModelType'] = function(){
        return this['__modelType'];
    };

    return <IModelSchema>obj;
}
