import * as express from 'express';

export default class Router{
    constructor(public app: express.Express){

    }

    initRoutes(){
        console.log('route init');
        this.app.get('/', (req, res) => {
            console.log('route called');
            res.send('hello world!');
            res.end();
        });
    }
}
