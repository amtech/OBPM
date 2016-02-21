import * as extend from 'extend';
import * as express from 'express';
import * as http from 'http';
import Router from './Router';

export interface ApiOptions{
    apiHost?: string
    apiPort?: number
    dbHost?: string
    dbPort?: number
}

var _defApiOpts: ApiOptions = {
    dbHost: 'localhost',
    dbPort: 8529,
    apiHost: 'localhost',
    apiPort: 8080
};

/**
 * Base API wrapper class.
 */
export class App{
    opts: ApiOptions;
    express: express.Express;
    private _server: http.Server;
    private _initialized: boolean;
    private _router: Router;

    /**
     * Creates a new API instance.
     *
     * @constructor
     *
     * @param {ApiOptions} [options] Optional API options to apply.
     *
     * @returns {App} new Api App instance.
     */
    constructor(options?: ApiOptions){
        this.opts = extend({}, options || {}, _defApiOpts);
        this.express = express();
        this._router = new Router(this.express);
    }

    /**
     * Starts the underlying web server based on the current API options.
     *
     * @method start
     */
    public start(): void{
        if(!this._initialized){
            this._initExpress();
        }
        this._server = this.express.listen(this.opts.apiPort, this.opts.apiHost);
    }

    /**
     * Stops the underlying webserver instance.
     * Use Api#start to restart the application.
     *
     * @method stop
     */
    public stop(): void {
        this._server.close();
    }

    /**
     * Initialized the express app behind this api.
     *
     * @method _initExpress
     */
    private _initExpress(): void{
        if(!this._initialized){
            this._initialized = true;
            this._router.initRoutes();
        }
    }
}

export default new App();
