import * as extend from 'extend';
import * as express from 'express';
import * as http from 'http';
import Router from './Router';
import * as bodyParser from 'body-parser';
import appConfig from './app-config';
import * as q from 'q';

/**
 * Base API wrapper class.
 */
export default class App {
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
    constructor(){
        this.express = express();
        this._router = new Router(this.express);
    }

    /**
     * Starts the underlying web server based on the current API options.
     *
     * @param {string[]} argv optional start arguments.
     *
     * @method start
     */
    public start(argv?: any): q.Promise<any>{
        let d = q.defer();
        try {
            this._parseArgs(argv);

            if(!this._initialized){
                this._initExpress();
            }

            this._server = this.express.listen(appConfig().apiPort, () => {
                console.log('oBPM service running on port ' + appConfig().apiPort);
                d.resolve();
            });
        } catch (err) {
            d.reject(err);
        }

        return d.promise;
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

    private _parseArgs(args) {
        let cfg = appConfig();
        cfg.authDatabase = args.authdb ? args.authdb : cfg.authDatabase;
        cfg.apiPort = args.port ? args.port : cfg.apiPort;
        cfg.dbPort = args.dbport ? args.dbport : cfg.dbPort;
    }
}
