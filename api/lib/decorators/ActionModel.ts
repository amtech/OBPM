import 'reflect-metadata';
import IModel from '../models/IModel';

export default function ActionModel<T>(type: {new(): T}){
    return function (target, methodName: string | symbol): void {
        Reflect.defineMetadata('modelType', new ModelAccessor<T>(type), target, methodName);
    };
}

export class ModelAccessor<T>{
    constructor(private type: {new(): T}){
    }

    getInstance(): T{
        return new this.type();
    }
}