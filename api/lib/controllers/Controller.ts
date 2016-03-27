import IController from './IController';
import ControllerContext from './ControllerContext';
import * as express from 'express';

/**
 * Default base controller class.
 */
export default class Controller implements IController{
    /**
     * Current controller context instance.
     */
    protected _context: ControllerContext;
    protected precessId: string;

    public context(): ControllerContext{
        return this._context;
    }

    /**
     * Initializes the controller.
     * @param {ControllerContext} context The current request's
     * controller context.
     */
    public init(context: ControllerContext): void{
        this._context = context;
        this.precessId = context.request.params['tid'];
    }
}
