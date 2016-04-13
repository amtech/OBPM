module.exports = function(grunt) {
    grunt.initConfig({
        ts: {
            dev: {
                tsconfig: true
            }
        },

        watch: {
            dev: {
                files: ['**/*.ts'],
                tasks: ['ts:dev']
            }
        }
    });

    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks("grunt-contrib-watch");
};
