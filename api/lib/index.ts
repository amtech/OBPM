import API from './Api';
import * as minimist from 'minimist';

let argv = minimist(process.argv.slice(2)),
    api = new API();
api.start(argv);
