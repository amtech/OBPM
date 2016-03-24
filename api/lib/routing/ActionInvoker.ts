import * as express from 'express';
import ControllerContext from '../controllers/ControllerContext';
import IController from '../controllers/IController';
import * as q from 'q';
import DependencyInjector from './DependencyInjector';
import * as extend from 'extend';
import httpErr from './HttpError';

export interface IActionInvokerOptions{
    rejectOnModelStateError?: boolean;
    controllerTypes: Array<{new(): IController}>;
}

export interface IInvokeOptions{
    actionName?: string;
    controllerName?: string;
}

export default class ActionInvoker{
    private _opts: IActionInvokerOptions;
    private _controllerTypes: any;

    private static _defInvokerOptions: IActionInvokerOptions = {
        rejectOnModelStateError: true,
        controllerTypes: []
    };

    constructor(options?: IActionInvokerOptions){
        this._opts = extend(true, {}, ActionInvoker._defInvokerOptions, (options || {}));
        this._controllerTypes = {};
        for(let t of this._opts.controllerTypes){
            this._controllerTypes[t.name.toLowerCase()] = t;
        }
    }

    /**
     * Resolves the controller type of the current request.
     * @returns {Function} the controller class function.
     * @private
     */
    private _resolveControllerType(ctrlName): Function{
        return this._controllerTypes[ctrlName.toLowerCase() + 'controller'];
    }

    /**
     * Returns an instance of the current controller type.
     * @returns {IController}
     * @private
     */
    private _resolveController(controllerParam: string, context: ControllerContext): IController{
        let ctrlFn = this._resolveControllerType(controllerParam);
        if(ctrlFn){
            let ctrl = this._createCtrlInstance(<{new(): IController}>ctrlFn);
            ctrl.init(context);
            return ctrl;
        }

        return null;
    }

    /**
     * Creates an instance of the given controller type.
     * @param {Function} ctrlFn Controller function to invoke.
     * @returns {IController} a controller instance.
     * @private
     */
    private _createCtrlInstance(ctrlFn: {new(): IController}): IController{
        return new ctrlFn();
    }

    private processActionResult(result: any, d: q.Deferred<any>): void{
        if(q.isPromise(result)){
            let actionPromise: q.Promise<any> = result;
            result.then(() => {
                d.resolve.apply(d, Array.prototype.slice.call(arguments));
            }, err => {
                d.reject(err);
            }).done();
        }else{
            if(result instanceof Error){
                d.reject(result);
            }else{
                d.resolve(result);
            }
        }
    }

    private _resolveControllerName(req: express.Request, options: IInvokeOptions): string{
        return req.params['controller'] || options.controllerName;
    }

    private actionExists(ctrl: IController, actionName: string){
        return ctrl && typeof ctrl[actionName] === 'function';
    }

    public _resolveActionName(req: express.Request, options: IInvokeOptions): string {
        if (options.actionName) {
            return options.actionName;
        }
        if (req.params['action']) {
            return req.params['action'];
        }
        let method = req.method.toLowerCase();
        if(method === 'get' && !req.params['id']){
            return 'getAll';
        }

        return method;
    }

    /**
     * Invokes the responsible action for the current request.
     *
     * @returns {Promise<any>}
     */
    public invoke(req: express.Request, res: express.Response, options?: IInvokeOptions): q.Promise<any> {
        let d = q.defer<any>(),
            _opts = options || {},
            _ctrlContext = new ControllerContext(req, res),
            _actionName = this._resolveActionName(req, options),
            _controllerName = this._resolveControllerName(req, options),
            ctrl = this._resolveController(_controllerName, _ctrlContext);

        if(!ctrl){
            d.reject(httpErr.notFound('The specified controller \'' + _controllerName + '\' could not be found.'));
            return d.promise;
        }

        if(!this.actionExists(ctrl, _actionName)){
            d.reject(httpErr.notFound('The specified action \'' + _actionName + '\' could not be found.'));
            return d.promise;
        }

        let injector = new DependencyInjector(ctrl, _actionName),
            actionResult: any;
        // Get the action parameters:
        injector.getParameterValues().then(params => {
            if(this._opts.rejectOnModelStateError && !_ctrlContext.modelState.isValid){
                // Do not execute the action:
                d.reject(httpErr.validation(_ctrlContext.modelState.errors));
            }else{
                try{
                    actionResult = ctrl[_actionName].apply(ctrl, params);
                    this.processActionResult(actionResult, d);
                }catch(err){
                    d.reject(httpErr.server(err));
                }
            }
        }, err => {
            d.reject(httpErr.server(err));
        }).done();

        return d.promise;
    }
}