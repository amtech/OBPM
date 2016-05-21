import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import * as supertest from 'supertest';
import db, {Database} from '../../lib/db';
var defaults = require('superagent-defaults');
import * as q from 'q';
import * as fs from 'fs';

chai.use(chaiAsPromised);
chai.use(sinonChai);
chai.use(require('chai-things'));
chai.use(require('chai-subset'));
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
    var file = fs.readFileSync(__dirname + '/../../../test/e2e/' + name);
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

describe('test process model and execution', () => {
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
                roles: ['student'],
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
                                content: { }
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
                roles: ['teacher'],
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
                roles: ['teacher'],
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
                roles: ['student'],
                documents: {
                    upload: {
                        type: 'Upload',
                        state: ['uploaded', 'rejected'],
                        endState: 'uploaded',
                        schema: {
                            type: 'object',
                            properties: {
                                mime: {type: 'string' },
                                content: { }
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

        it('executes assignProfessor', done => {
            teacher.post('/execution').send({
                actionId: model.actions.assignProfessor,
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
            teacher.post('/execution').send({
                actionId: model.actions.assignStudent,
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
            student.post('/execution').send({
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

        it('executes rejectUpload', done => {
            teacher.post('/execution').send({
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

        it('executes editUpload', done => {
            student.post('/execution').send({
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

        it('executes acceptUpload', done => {
            teacher.post('/execution').send({
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
        //delete test database after finishing all tests:
        modeler.delete('').expect(200).end(handle(done));
    });
});
