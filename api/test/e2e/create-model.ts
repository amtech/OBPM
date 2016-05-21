import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import * as supertest from 'supertest';
import db, {Database} from '../../lib/db';
var defaults = require('superagent-defaults');
import * as q from 'q';

chai.use(chaiAsPromised);
chai.use(sinonChai);
chai.use(require('chai-things'));
let expect = chai.expect;

let modeler,
    teacher,
    student;

// test case config data:
let config = {
    url: 'http://localhost:8090/',
    clientId: 'e2e-test-client',
    clientSecret: 'e2e-test-dg2343%.s79',
    dbName: 'e2e-test',
    users: [{
        userName: 'test-modeler',
        password: 'test-modeler-cs75=9&s'
    }, {
        userName: 'test-teacher',
        password: 'test-teacher-x,783&nj'
    }, {
        userName: 'test-student',
        password: 'test-student-bf6&hn.='
    }]
};

// process model data:
let model = {
    types: {case: '', thesis: '', prof: '', student: '', upload: ''},
    actions: {
        createThesis: '',
        uploadFile: '',
        rejectUpload: '',
        acceptUpload: '',
        changeTitle: '',
        acceptTitle: '',
        assignStudent: ''
    }
}

// process data:
let procData = {
    case: '',
    thesis: '',
    student: '',
    professor: ''
}

/**
 * Conversta string to base64.
 *
 * @type {}
 */
let btoa = (str: string) => {
    return new Buffer(str).toString('base64');
}

/**
 * Handles the response of an API call.
 *
 * @param {function} done mocha done callback
 * @param {function} [handler] Optional response handler
 */
let handle = (done, handler?) => {
    return (err, res) => {
        if(err || res.body.err === false) {
            console.error(res.body);
            done(err || res.body);
        } else {
            if (handler) handler(res);
            done();
        }
    };
}

let getUser = (user): q.Promise<any> => {
    var d = q.defer();
    supertest(config.url)
    .post('oauth/token')
    .set('Authorization', 'Basic ' + btoa(`${config.clientId}:${config.clientSecret}`))
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .type('form')
    .send({grant_type: 'password'})
    .send({username: user.userName})
    .send({password: user.password})
    .end((err, res) => {
        if(err || res.error || res.status !== 200) {
            d.reject(err || res.error);
        } else {
            let api = defaults(supertest(`${config.url}${config.dbName}`))
            .set('Authorization', 'Bearer ' + res.body.access_token);
            d.resolve({api, user});
        }
    });

    return d.promise;
};

describe('create a process model', () => {
    before(done => {
        q.all(config.users.map(u => {
            return getUser(u);
        }))
        .then((result => {
            modeler = result.find(r => r.user.userName === 'test-modeler').api;
            teacher = result.find(r => r.user.userName === 'test-teacher').api;
            student = result.find(r => r.user.userName === 'test-student').api;
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
                        state: 'created',
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

        it('creates action uploadDocument', done => {
            modeler.post('/action').send({
                name: 'uploadDocument',
                roles: ['student'],
                documents: {
                    thesis: {
                        type: 'Thesis',
                        state: 'assigned',
                        endState: 'assigned'
                    },
                    newDocument: {
                        endState: 'uploaded',
                        path: 'thesis.uploads',
                        schema: {
                            type: 'object',
                            properties: {
                                fileName: { type: 'string' },
                                mime: {type: 'string' },
                                content: { type: 'any' }
                            },
                            required: ['fileName', 'mime', 'content']
                        }
                    }
                }
            })
            .expect(200)
            .end(handle(done, res => {
                model.actions.uploadFile = res.body._key;
            }));
        });

        it('executes createThesis', done => {
            teacher.post('/execution').send({
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

        it('executes assignStudent', done => {
            teacher.post('/execution').send({
                actionId: model.actions.assignStudent,
                caseId: procData.case,
                documents: {
                    thesis: {
                        id: procData.thesis
                    },
                    newStudent: {
                        data: {
                            userName: 'e2e-test-student'
                        }
                    }
                }
            })
            .expect(200)
            .end(handle(done, res => {
                procData.student = res.body._key;
            }));
        });
    });

    after(done => {
        //delete test database after finishing all tests:
        modeler.delete('').expect(200).end(handle(done));
    });
});
