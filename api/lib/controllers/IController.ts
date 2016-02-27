import ControllerContext from './ControllerContext';

interface IController{
    init(context: ControllerContext): void;
}

export default IController;