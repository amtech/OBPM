import 'reflect-metadata';

export default function ActionAuthorization(groups: string[]){
    return function (target, methodName: string | symbol): void {
        Reflect.defineMetadata(
            'authorization',
            groups,
            target,
            methodName);
    };
}
