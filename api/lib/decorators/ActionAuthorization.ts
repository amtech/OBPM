import 'reflect-metadata';

export default function ActionAuthorization(groups: string[]){
    return function (target, methodName: string | symbol): void {
        let g = groups;
        g['__override'] = true;
        Reflect.defineMetadata(
            'authorization',
            g,
            target,
            methodName);
    };
}
