import 'reflect-metadata';
import IModel from '../models/IModel';

export default function ActionModel<T>(type: {new(): T}){
    return function (target, methodName: string | symbol): void {
        Reflect.defineMetadata('modelType', new ModelAccessor<T>(type), target, methodName);
    };
}

export class ModelAccessor<T>{
    protected _type: {new(): T};
    constructor(type: {new(): T}){
        this._type = type;
    }

    get type(): {new(): T}{
        return this._type;
    }

    getInstance(): T{
        return new this.type();
    }
}

export class GenericModelAccessor extends ModelAccessor<any>{
}