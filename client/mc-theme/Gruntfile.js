/*!
 * MoneyCircles Bootstrap Theme Gruntfile
 * http://moneysircles.com
 * Copyright 2015 MoneyCircles
 */

module.exports = function(grunt) {
  require('jit-grunt')(grunt);

  grunt.initConfig({
    less: {
      development: {
        options: {
          compress: true,
          yuicompress: true,
          optimization: 2
        },
        files: {
          "../vendors/bootstrap/dist/css/bootstrap.css": "bootstrap.less" // destination file and source file
        }
      }
    },
    watch: {
      styles: {
        files: ['*.less'], // which files to watch
        tasks: ['less'],
        options: {
          nospawn: true
        }
      }
    }
  });

  grunt.registerTask('default', ['less', 'watch']);
};
