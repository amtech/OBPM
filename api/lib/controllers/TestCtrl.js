var TestCtrl = (function () {
    function TestCtrl() {
    }
    TestCtrl.myStaticMethod = function () {
    };
    TestCtrl.prototype.init = function () {
        console.log('ueppaaaaa!');
    };
    TestCtrl.prototype.callInit = function () {
        this.init();
    };
    return TestCtrl;
})();
exports["default"] = TestCtrl;
//# sourceMappingURL=TestCtrl.js.map