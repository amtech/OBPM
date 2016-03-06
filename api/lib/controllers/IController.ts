import ControllerContext from './ControllerContext';

interface IController{
    init(context: ControllerContext): void;
    context(): ControllerContext;
}

export default IController;