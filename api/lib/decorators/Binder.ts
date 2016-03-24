import 'reflect-metadata';
import ModelBinder from '../routing/ModelBinder';

export function property(binder: ModelBinder){
    return function (target, methodName: string | symbol): void {
        Reflect.defineMetadata('binder', binder, target, methodName);
    };
}

export function model(binder: ModelBinder){
    return function (target: Function): void {
        Reflect.defineMetadata('binder', binder, target.prototype);
    };
}