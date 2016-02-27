module.exports = function(grunt) {
    grunt.initConfig({
        ts: {
            dev: {
                tsconfig: true
            }
        },

        watch: {
            ts: {
                files: ['**/*.ts'],
                tasks: ['ts']
            }
        }
    });

    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks("grunt-contrib-watch");
};