import IController from './IController';
import ControllerContext from './ControllerContext';

/**
 * Default base controller class.
 */
export default class Controller implements IController{
    /**
     * Current controller context instance.
     */
    protected _context: ControllerContext;

    public context(): ControllerContext{
        return this._context;
    }

    /**
     * Initializes the controller.
     * @param {ControllerContext} context The current request's
     * controller context.
     */
    init(context: ControllerContext): void{
        this._context = context;
    }
}