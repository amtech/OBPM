import * as express from 'express';
import ControllerContext from '../controllers/ControllerContext';
import IController from '../controllers/IController';

export default class ActionInvoker{
    private _ctrlContext: ControllerContext;
    private _ctrlType: Function;
    private _ctrl: IController;
    private _actionName: string;
    private _action: Function;

    constructor(req: express.Request, res: express.Response){
        this._ctrlContext = new ControllerContext(req, res);
        this._actionName = this._ctrlContext.request.params['action'];
    }

    /**
     * Resolves the controller type of the current request.
     * @returns {Function} the controller class function.
     * @private
     */
    private _resolveControllerType(): Function{
        if(typeof this._ctrlType === 'undefined'){
            let ctrlName = this._ctrlContext.request.params['controller'];
            this._ctrlType = require('../controllers/' + ctrlName);
        }

        return this._ctrlType;
    }

    /**
     * Returns an instance of the current controller type.
     * @returns {IController}
     * @private
     */
    private _resolveController(): IController{
        if(typeof this._ctrl === 'undefined'){
            let ctrlFn = this._resolveControllerType();
            let ctrl = this._createCtrlInstance(ctrlFn);
            ctrl.init(this._ctrlContext);
        }

        return this._ctrl;
    }

    /**
     * Resolves the action function of the current request.
     * @param {Function} ctrlType The type of controller.
     * @returns {Function}
     * @private
     */
    private _resolveAction(ctrlType: Function): string{
        // todo: Filter for functions.
        return ctrlType.prototype[this._actionName];
    }

    /**
     * Creates an instance of the given controller type.
     * @param {Function} ctrlFn Controller function to invoke.
     * @returns {IController} a controller instance.
     * @private
     */
    private _createCtrlInstance(ctrlFn: Function): IController{
        return ctrlFn.prototype.constructor.call();
    }
}