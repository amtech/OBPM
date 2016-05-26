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
    port: 8095,
    url: 'http://localhost:8095/',
    clientId: 'e2e-test-client',
    clientSecret: 'e2e-test-dg2343%.s79',
    dbName: 'e2e-test',
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
    types: {
        case: '',
        thesis: '',
        prof: '',
        student: '',
        upload: '',
        test1: '', test2: ''
    },
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

        prepareDatabases()
        .then(() => {
            return startupApi();
        })
        .then(() => {
            return getUserApi({userName: 'admin', password: 'admin'}, config.dbName);
        })
        .then(result => {
            admin = result.api;
        })
        .then(() => {
            return q.all(config.users.map(u => {
                return createUser(admin, u)
                .then(newUser => {
                    u['_key'] = newUser.body._key;
                })
                .then(() => getUserApi(u, config.dbName));
            }));
        })
        .then((result => {
            modeler = result.find(r => r.user.userName === 'test-modeler').api;
            teacher1 = result.find(r => r.user.userName === 'test-teacher1').api;
            student1 = result.find(r => r.user.userName === 'test-student1').api;
            teacher2 = result.find(r => r.user.userName === 'test-teacher2').api;
            student2 = result.find(r => r.user.userName === 'test-student2').api;
            done();
        }), err => {
            done(err);
        });
    });

    describe('create process data model', () => {
        it('creates a new case', done => {
            modeler.post('/datamodel').send({ type: 'Case' })
            .expect(200)
            .end(handle(done, res => {
                model.types.case = res.body._key;
            }));
        });

        it('creates type Thesis', done => {
            modeler.post('/datamodel').send({
                type: 'Thesis',
                parent: model.types.case,
                property: 'thesis',
                max: 1
            })
            .expect(200)
            .end(handle(done, res => {
                model.types.thesis = res.body._key;
            }));
        });

        it('creates type Person for student', done => {
            modeler.post('/datamodel').send({
                type: 'Person',
                parent: model.types.case,
                property: 'student',
                max: 1
            })
            .expect(200)
            .end(handle(done, res => {
                model.types.student = res.body._key;
            }));
        });

        it('creates type Person for professor', done => {
            modeler.post('/datamodel').send({
                type: 'Person',
                parent: model.types.case,
                property: 'professor',
                max: 1
            })
            .expect(200)
            .end(handle(done, res => {
                model.types.prof = res.body._key;
            }));
        });

        it('creates type Upload', done => {
            modeler.post('/datamodel').send({
                type: 'Upload',
                parent: model.types.thesis,
                property: 'uploads'
            })
            .expect(200)
            .end(handle(done, res => {
                model.types.upload = res.body._key;
            }));
        });

        it('created a correct model tree', done => {
            modeler.get('/datamodel/tree')
            .expect(200)
            .end(handle(done, res => {
                expect(res.body).to.have.property('root');
                expect(res.body.root).to['containSubset']({
                    thesis: {
                        __max: 1,
                        type: 'Thesis',
                        uploads: {
                            type: 'Upload'
                        }
                    },
                    student: {
                        __max: 1,
                        type: 'Person'
                    },
                    professor: {
                        __max: 1,
                        type: 'Person'
                    }
                });
            }));
        });

        it('cannot edit type Case', done => {
            modeler.put('/datamodel').send({
                type: 'Case'
            })
            .expect(400)
            .end(handle(done));
        });

        it('allows creating type Test1', done => {
            modeler.post('/datamodel').send({
                type: 'Test1',
                parent: model.types.case,
                property: 'test1',
                max: 1
            })
            .expect(200)
            .end(handle(done, res => {
                model.types.test1 = res.body._key;
            }));
        });
        it('allows creating type Test2', done => {
            modeler.post('/datamodel').send({
                type: 'Test2',
                parent: model.types.test1,
                property: 'test2',
                max: 1
            })
            .expect(200)
            .end(handle(done, res => {
                model.types.test2 = res.body._key;
            }));
        });

        it('allows changing the parent of a type', done => {
            modeler.put('/datamodel/' + model.types.test1).send({
                type: 'Test1',
                parent: model.types.student,
                property: 'test1',
                max: 1
            })
            .expect(200)
            .end(handle(done));
        });

        it('created a correct model tree after edit', done => {
            modeler.get('/datamodel/tree')
            .expect(200)
            .end(handle(done, res => {
                expect(res.body).to.have.property('root');
                expect(res.body.root).to['containSubset']({
                    student: {
                        __max: 1,
                        type: 'Person',
                        test1: {
                            type: 'Test1',
                            test2: {
                                type: 'Test2'
                            }
                        }
                    }
                });
            }));
        });

        it('deletes Test1 and all Sub-Types', done => {
            modeler.delete('/datamodel/' + model.types.test1)
            .expect(200)
            .end(handle(done));
        });

        it('removed deleted types', done => {
            modeler.get('/datamodel')
            .expect(200)
            .end(handle(done, res => {
                expect(res.body.every(t => t.type !== 'Test1')).equal(true);
                expect(res.body.every(t => t.type !== 'Test2')).equal(true);
            }));
        });
    });

    describe('create action definitions', () => {

        it('creates action createThesis', done => {
            modeler.post('/action').send({
                "createsNewCase": true,
                "name": "createThesis",
                "roles": ["teacher"],
                "documents": {
                    "newThesis": {
                        "type": "Thesis",
                        "path": "thesis",
                        "endState": "created",
                        "schema": {
                            "type": "object",
                            "properties": {
                                "title": {
                                    "type": "string"
                                },
                                "description": {
                                    "type": "string"
                                }
                            },
                            "required": ["title","description"]
                        }
                    }
                }
            })
            .expect(200)
            .end(handle(done, res => {
                model.actions.createThesis = res.body._key;
            }));
        });

        it('creates action assignStudent', done => {
            modeler.post('/action').send({
                name: 'assignStudent',
                roles: ['teacher'],
                documents: {
                    thesis: {
                        type: 'Thesis',
                        state: ['assignedToProfessor'],
                        endState: 'assigned'
                    },
                    newStudent: {
                        type: 'Person',
                        path: 'student',
                        endState: 'assigned',
                        schema: {
                            type: 'object',
                            properties: {
                                userName: { type: 'string' }
                            },
                            required: ['userName']
                        }
                    }
                }
            })
            .expect(200)
            .end(handle(done, res => {
                model.actions.assignStudent = res.body._key;
            }));
        });

        it('creates action assignProfessor', done => {
            modeler.post('/action').send({
                name: 'assignProfessor',
                roles: ['teacher'],
                documents: {
                    thesis: {
                        type: 'Thesis',
                        state: ['created'],
                        endState: 'assignedToProfessor'
                    },
                    newProfessor: {
                        type: 'Person',
                        path: 'professor',
                        endState: 'assigned',
                        schema: {
                            type: 'object',
                            properties: {
                                userName: { type: 'string' }
                            },
                            required: ['userName']
                        }
                    }
                }
            })
            .expect(200)
            .end(handle(done, res => {
                model.actions.assignProfessor = res.body._key;
            }));
        });

        it('creates action uploadDocument', done => {
            modeler.post('/action').send({
                name: 'uploadDocument',
                roles: ['%student.data.userName'],
                documents: {
                    thesis: {
                        type: 'Thesis',
                        state: ['assigned'],
                        endState: 'assigned'
                    },
                    newDocument: {
                        endState: 'uploaded',
                        path: 'thesis.uploads',
                        type: 'Upload',
                        schema: {
                            type: 'object',
                            properties: {
                                fileName: { type: 'string' },
                                mime: {type: 'string' },
                                content: { type: 'string' }
                            },
                            required: ['fileName', 'mime', 'content']
                        }
                    }
                }
            })
            .expect(200)
            .end(handle(done, res => {
                model.actions.uploadDocument = res.body._key;
            }));
        });

        it('creates action rejectUpload', done => {
            modeler.post('/action').send({
                name: 'rejectUpload',
                roles: ['%professor.data.userName'],
                documents: {
                    upload: {
                        type: 'Upload',
                        state: ['uploaded'],
                        endState: 'rejected'
                    }
                }
            })
            .expect(200)
            .end(handle(done, res => {
                model.actions.rejectUpload = res.body._key;
            }));
        });

        it('creates action acceptUpload', done => {
            modeler.post('/action').send({
                name: 'acceptUpload',
                roles: ['%professor.data.userName'],
                documents: {
                    upload: {
                        type: 'Upload',
                        state: ['uploaded'],
                        endState: 'accepted'
                    }
                }
            })
            .expect(200)
            .end(handle(done, res => {
                model.actions.acceptUpload = res.body._key;
            }));
        });

        it('creates action editUpload', done => {
            modeler.post('/action').send({
                name: 'editUpload',
                roles: ['%student.data.userName'],
                documents: {
                    upload: {
                        type: 'Upload',
                        state: ['uploaded', 'rejected'],
                        endState: 'uploaded',
                        schema: {
                            type: 'object',
                            properties: {
                                mime: {type: 'string' },
                                content: { type: 'string' }
                            },
                            required: ['mime', 'content']
                        }
                    }
                }
            })
            .expect(200)
            .end(handle(done, res => {
                model.actions.editUpload = res.body._key;
            }));
        });

    });

    describe('execute actions', () => {

        it('allows theachers to execute createThesis', done => {
            teacher1.get('/action/executables')
            .expect(200)
            .end(handle(done, res => {
                expect(res.body.length).equal(1);
                expect(res.body[0].actionName).equal('createThesis');
            }));
        });

        it('Does not allow students to execute any actions', done => {
            student1.get('/action/executables')
            .expect(200)
            .end(handle(done, res => {
                expect(res.body.length).equal(0);
            }));
        });

        it('teacher1 executes createThesis', done => {
            teacher1.post('/execution').send({
                actionId: model.actions.createThesis,
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
            .end(handle(done));
        });

        it('created a new case and thesis document', done => {
            modeler.get('/document')
            .expect(200)
            .end(handle(done, res => {
                expect(res.body.length).to.equal(2);
                let caseDoc = res.body.filter(d => d.type === 'Case')[0],
                    thesisDoc = res.body.filter(d => d.type === 'Thesis')[0];
                expect(caseDoc.state).equal('created');
                expect(thesisDoc.state).equal('created');

                procData.case = caseDoc._key;
                procData.thesis = thesisDoc._key;
            }));
        });

        it('allows theachers to execute createThesis and assignProfessor', done => {
            teacher1.get('/action/executables')
            .expect(200)
            .end(handle(done, res => {
                expect(res.body.length).equal(2);
                expect(res.body.some(a => a.actionName === 'createThesis')).equal(true);
                expect(res.body.some(a => a.actionName === 'assignProfessor')).equal(true);
            }));
        });

        it('teacher2 executes assignProfessor', done => {
            teacher1.post('/execution').send({
                actionId: model.actions.assignProfessor,
                caseId: procData.case,
                documents: {
                    thesis: {
                        id: procData.thesis
                    },
                    newProfessor: {
                        data: {
                            userName: 'test-teacher1'
                        }
                    }
                }
            })
            .expect(200)
            .end(handle(done));
        });

        it('teacher1 executes assignStudent', done => {
            teacher1.post('/execution').send({
                actionId: model.actions.assignStudent,
                caseId: procData.case,
                documents: {
                    thesis: {
                        id: procData.thesis
                    },
                    newStudent: {
                        data: {
                            userName: 'test-student1'
                        }
                    }
                }
            })
            .expect(200)
            .end(handle(done));
        });

        it('allows student1 to execute uploadDocument', done => {
            student1.get('/action/executables')
            .expect(200)
            .end(handle(done, res => {
                expect(res.body.length).equal(1);
                expect(res.body.some(a => a.actionName === 'uploadDocument')).equal(true);
            }));
        });

        it('Does not allow student2 to execute uploadDocument', done => {
            student2.get('/action/executables')
            .expect(200)
            .end(handle(done, res => {
                expect(res.body.length).equal(0);
            }));
        });

        it('student1 executes uploadDocument', done => {
            student1.post('/execution').send({
                actionId: model.actions.uploadDocument,
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

        it('allows teacher1 to execute rejectUpload and acceptUpload', done => {
            teacher1.get('/action/executables')
            .expect(200)
            .end(handle(done, res => {
                expect(res.body.some(a => a.actionName === 'acceptUpload')).equal(true);
                expect(res.body.some(a => a.actionName === 'rejectUpload')).equal(true);
            }));
        });

        it('Does not allow teacher2 to execute rejectUpload and acceptUpload', done => {
            teacher2.get('/action/executables')
            .expect(200)
            .end(handle(done, res => {
                expect(res.body.some(a => a.actionName === 'acceptUpload')).equal(false);
                expect(res.body.some(a => a.actionName === 'rejectUpload')).equal(false);
            }));
        });

        it('teacher1 executes rejectUpload', done => {
            teacher1.post('/execution').send({
                actionId: model.actions.rejectUpload,
                caseId: procData.case,
                documents: {
                    upload: {
                        id: procData.uploads.Sitzungsprotokoll
                    }
                }
            })
            .expect(200)
            .end(handle(done));
        });

        it('student1 executes editUpload', done => {
            student1.post('/execution').send({
                actionId: model.actions.editUpload,
                caseId: procData.case,
                documents: {
                    upload: {
                        id: procData.uploads.Sitzungsprotokoll,
                        data: {
                            mime: 'application/pdf',
                            content: getFileStr('Sitzungsprotokoll 2.pdf')
                        }
                    }
                }
            })
            .expect(200)
            .end(handle(done));
        });

        it('teacher1 executes acceptUpload', done => {
            teacher1.post('/execution').send({
                actionId: model.actions.acceptUpload,
                caseId: procData.case,
                documents: {
                    upload: {
                        id: procData.uploads.Sitzungsprotokoll
                    }
                }
            })
            .expect(200)
            .end(handle(done));
        });
    });

    after(done => {
        // delete test database after finishing all tests and remove
        // previously created test users.
        cleanupDatabases().then(() => done(), done);
    });
});
