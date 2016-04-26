import * as extend from 'extend';
import * as express from 'express';
import * as http from 'http';
import Router from './Router';
import * as bodyParser from 'body-parser';

export interface ApiOptions{
    apiHost?: string;
    apiPort?: number;
    dbHost?: string;
    dbPort?: number;
}

/**
 * Base API wrapper class.
 */
export class App {
    opts: ApiOptions;
    express: express.Express;
    private _server: http.Server;
    private _initialized: boolean;
    private _router: Router;

    /**
     * Default Api options.
     * @type {{dbHost: string, dbPort: number, apiHost: string, apiPort: number}}
     * @private
     */
    private static _defApiOpts: ApiOptions = {
        dbHost: 'localhost',
        dbPort: 8529,
        apiHost: 'localhost',
        apiPort: 8090
    };

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
        this.opts = extend({}, App._defApiOpts, (options || {}));
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
        this._server = this.express.listen(this.opts.apiPort);
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

            this.express.use(bodyParser.json());
            this.express.use(bodyParser.urlencoded({extended: true}));

            this._router.initRoutes();
        }
    }
}

export default new App();
