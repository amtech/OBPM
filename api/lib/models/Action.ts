import IModel from './IModel';

export default class Action implements IModel{
    constructor(){
    }

    getSchema(): void {
        console.log('bla');
    }
}