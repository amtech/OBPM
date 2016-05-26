import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import * as supertest from 'supertest';
import db, {Database} from '../lib/db';
var defaults = require('superagent-defaults');
import * as q from 'q';
import * as fs from 'fs';
import API from '../lib/Api';

chai.use(chaiAsPromised);
chai.use(sinonChai);
chai.use(require('chai-things'));
chai.use(require('chai-subset'));
let expect = chai.expect;

let modeler,
    admin,
    teacher1,
    student1,
    teacher2,
    student2;

// test case config data:
let config = {
    port: 8090,
    url: 'http://localhost:8090/',
    clientId: 'e2e-test-client',
    clientSecret: 'e2e-test-dg2343%.s79',
    dbName: 'perf-test-250',
    authDatabase: 'test-users',
    users: [{
        userName: 'test-modeler',
        password: 'test-modeler-cs75=9&s',
        firstName: 'test', lastName: 'modeler', email: 'test@obpm',
        roles: ['modeler']
    }, {
        userName: 'test-teacher1',
        password: 'test-teacher1-x,783&nj',
        firstName: 'test', lastName: 'teacher1', email: 'test@obpm',
        roles: ['teacher']
    }, {
        userName: 'test-student1',
        password: 'test-student1-bf6&hn.=',
        firstName: 'test', lastName: 'student1', email: 'test@obpm',
        roles: ['student']
    }, {
        userName: 'test-teacher2',
        password: 'test-teacher2-x,783&nj',
        firstName: 'test', lastName: 'teacher2', email: 'test@obpm',
        roles: ['teacher']
    }, {
        userName: 'test-student2',
        password: 'test-student2-bf6&hn.=',
        firstName: 'test', lastName: 'student2', email: 'test@obpm',
        roles: ['student']
    }]
};

// process model data:
let model = {
    types: {case: '', thesis: '', prof: '', student: '', upload: ''},
    actions: {
        createThesis: '',
        uploadDocument: '',
        rejectUpload: '',
        acceptUpload: '',
        editUpload: '',
        changeTitle: '',
        acceptTitle: '',
        rejectTitle: '',
        assignStudent: '',
        assignProfessor: ''
    }
}

// process data:
let procData = {
    case: '',
    thesis: '',
    student: '',
    professor: '',
    uploads: {
        Sitzungsprotokoll: ''
    }
}

/**
 * Conversta string to base64.
 *
 * @type {}
 */
let btoa = (data: any): string => {
    return new Buffer(data).toString('base64');
}

let getFileStr = (name: string): string => {
    var file = fs.readFileSync(__dirname + '/../../test/files/' + name);
    return btoa(file);
}

/**
 * Handles the response of an API call.
 *
 * @param {function} done mocha done callback
 * @param {function} [handler] Optional response handler
 */
let handle = (done, handler?) => {
    return (err, res) => {
        if(err || res.err || res.body.err === true) {
            console.error(res.body);
            done(err || res.err);
        } else {
            if (handler) handler(res);
            done();
        }
    };
}

let toQ = (call): q.Promise<any> => {
    let d = q.defer();
    call.end((err, res) => {
        err = err || res.error;
        if (err) console.log(err), d.reject(err);
        else d.resolve(res);
    });

    return d.promise;
}

/**
 * Creates and returns an api interface fr the specified user config.
 */
let getUserApi = (user, dbName): q.Promise<any> => {
    return toQ(supertest(config.url)
    .post('oauth/token')
    .set('Authorization', 'Basic ' + btoa(`${config.clientId}:${config.clientSecret}`))
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .type('form')
    .send({grant_type: 'password'})
    .send({username: user.userName})
    .send({password: user.password}))
    .then(res => {
        let api = defaults(supertest(`${config.url}${dbName}`))
        .set('Authorization', 'Bearer ' + res.body.access_token);
        return {api, user};
    });
};

/**
 * Creates a new oBPM user based on the provided config.
 * @param {object} admin admin API interface.
 * @param {object} userCfg User config.
 */
let createUser = (admin, userCfg): q.Promise<any> => {
    return toQ(admin.post('/user').send(userCfg));
}

/**
 * Removes a single user.
 */
let removeUser = (key: any): q.Promise<any> => {
    return toQ(admin.delete('/user/' + key));
}

/**
 * Makes shure that no old data is in datastore and removes
 * old database instances is existing.
 */
let prepareDatabases = (): q.Promise<any> => {
    let testDB = new Database(config.dbName),
        authDB = new Database(config.authDatabase),
        promises = [];

    promises.push(testDB.exists().then(exists => {
        return exists ? testDB.drop() : undefined;
    }));
    promises.push(authDB.exists().then(exists => {
        return exists ? authDB.drop() : undefined;
    }));

    return q.all(promises);
};

/**
 * Removes all test datastores.
 */
let cleanupDatabases = (): q.Promise<any> => {
    return toQ(admin.delete(''))
    .then(() => {
        return (new Database(config.authDatabase)).drop()
    });
};

let startupApi = (): q.Promise<any> => {
    let api = new API();
    return api.start({ port: config.port, authdb: config.authDatabase });
}

describe('test process model and execution', () => {

    /**
     * Gets executed before each full test run.
     * Creates all necessary oBPM users by the default admin account and then
     * authenticates each user against the API.
     */
    before(done => {
        return getUserApi({userName: 'admin', password: 'admin'}, config.dbName)
        .then(result => {
            admin = result.api;
        }).then(() => {
            done();
        });
    });

    describe('execute actions', () => {

        it('executes createThesis', done => {
            admin.post('/execution').send({
                actionId: '170860052603',
                documents: {
                    newThesis: {
                        data: {
                            title: 'e2e Test Thesis',
                            description: 'This is a test document of type Thesis'
                        }
                    }
                }
            })
            .expect(200)
            .end(handle(done, res => {
                procData.case = res.body.find(d => d.type === 'Case')._key;
                procData.thesis = res.body.find(d => d.type === 'Thesis')._key;
            }));
        });

        it('executes assignProfessor', done => {
            admin.post('/execution').send({
                actionId: '170861756539',
                caseId: procData.case,
                documents: {
                    thesis: {
                        id: procData.thesis
                    },
                    newProfessor: {
                        data: {
                            userName: 'test-teacher'
                        }
                    }
                }
            })
            .expect(200)
            .end(handle(done));
        });

        it('executes assignStudent', done => {
            admin.post('/execution').send({
                actionId: '170861166715',
                caseId: procData.case,
                documents: {
                    thesis: {
                        id: procData.thesis
                    },
                    newStudent: {
                        data: {
                            userName: 'test-student'
                        }
                    }
                }
            })
            .expect(200)
            .end(handle(done));
        });

        it('executes uploadDocument', done => {
            admin.post('/execution').send({
                actionId: '170862739579',
                caseId: procData.case,
                documents: {
                    thesis: {
                        id: procData.thesis
                    },
                    newDocument: {
                        data: {
                            fileName: 'Sitzungsprotokoll 1.pdf',
                            mime: 'application/pdf',
                            content: getFileStr('Sitzungsprotokoll 1.pdf')
                        }
                    }
                }
            })
            .expect(200)
            .end(handle(done, res => {
                procData.uploads.Sitzungsprotokoll =
                    res.body.find(f => f.type === 'Upload')._key;
            }));
        });

        it('executes uploadDocument', done => {
            admin.post('/execution').send({
                actionId: '170862739579',
                caseId: procData.case,
                documents: {
                    thesis: {
                        id: procData.thesis
                    },
                    newDocument: {
                        data: {
                            fileName: 'Sitzungsprotokoll 2.pdf',
                            mime: 'application/pdf',
                            content: getFileStr('Sitzungsprotokoll 2.pdf')
                        }
                    }
                }
            })
            .expect(200)
            .end(handle(done, res => {
                procData.uploads.Sitzungsprotokoll =
                    res.body.find(f => f.type === 'Upload')._key;
            }));
        });
    });

    after(done => {
        // delete test database after finishing all tests and remove
        // previously created test users.
        done(); //cleanupDatabases().then(() => done(), done);
    });
});
