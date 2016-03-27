var schema = require('../dist/lib/models/ModelSchema').default;
var joi = require('joi');
var ModelBinder = require('../dist/lib/routing/ModelBinder').default;

var binder = new ModelBinder();

function MyClass(){

}

MyClass.prototype.getSchema = function () {
    return schema(MyClass).keys({
        firstName: joi.string().required()
    });
};

binder.bind(new MyClass(), {firstName: 'Remo'}).then(function (res) {
    console.log(res);
});
