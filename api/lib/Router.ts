import * as express from 'express';

export default class Router{
    constructor(public app: express.Express){

    }

    /**
     * Initializes all express request routes.
     */
    initRoutes(){
        console.log('route init');
        this.app.get('/', (req: express.Request, res: express.Response) => {
            console.log('route called');
            res.send('hello world!');
            res.end();
        });
    }
}
