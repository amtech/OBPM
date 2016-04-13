import 'reflect-metadata';
import IModel from '../models/IModel';

export default function ActionModel<T>(type: {new(): T}, bind?: boolean){
    return function (target, methodName: string | symbol): void {
        Reflect.defineMetadata(
            'modelType',
            new ModelAccessor<T>(type, bind === false ? bind : true),
            target,
            methodName);
    };
}

export class ModelAccessor<T>{
    protected _type: {new(): T};
    protected _bind: boolean;
    constructor(type: {new(): T}, bind: boolean){
        this._type = type;
        this._bind = bind;
    }

    get type(): {new(): T} {
        return this._type;
    }

    get bind(): boolean {
        return this._bind;
    }

    getInstance(): T{
        return new this.type();
    }
}

export class GenericModelAccessor extends ModelAccessor<any>{
}
