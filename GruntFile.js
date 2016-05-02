module.exports = function (grunt) {
	// Project configuration.
	grunt.initConfig({
		pkg : grunt.file.readJSON('package.json'),

		nodemon : {
			dev : {
				script : 'server.js'
			},
			options : {
				ignore : ['node_modules/**', 'Gruntfile.js'],
				env : {
					PORT : '3123'
				}
			}
		},

		less: {
	      development: {
	        options: {
	          compress: true,
	          yuicompress: true,
	          optimization: 2
	        },
	        files: {
	          "client/vendors/bootstrap/dist/css/bootstrap.css": "client/mc-theme/bootstrap.less" // destination file and source file
	        }
	      }
	    },

		watch : {
			scripts : {
				files : ['**/*.ts', '!node_modules/**/*.ts', '**/**/*.less'], // the watched files
				// tasks : ["newer:tslint:all", "ts:build"], // the task to run
				tasks : ['ts:build', 'less'], // the task to run
				options : {
					spawn : false // makes the watch task faster
				}
			}
		},

		concurrent : {
			watchers : {
				tasks : ['nodemon', 'watch'],
				options : {
					logConcurrentOutput : true
				}
			}
		},

		// tslint : {
			// options : {
				// configuration : grunt.file.readJSON("tslint.json")
			// },
			// all : {
				// src : ["**/*.ts", "!node_modules/**/*.ts", "!obj/**/*.ts", "!typings/**/*.ts"]// avoid linting typings files and node_modules files
			// }
		// },
		ts : {
			build : {
				src : ["**/*.ts", "!node_modules/**/*.ts"], // Avoid compiling TypeScript files in node_modules
				options : {
					module : 'commonjs', // To compile TypeScript using external modules like NodeJS
					fast : 'never' // You'll need to recompile all the files each time for NodeJS
				}
			}
		}
	});

	grunt.loadNpmTasks("grunt-ts");
	grunt.loadNpmTasks("grunt-contrib-watch");
	grunt.loadNpmTasks("grunt-nodemon");
	grunt.loadNpmTasks("grunt-concurrent");
	grunt.loadNpmTasks('grunt-contrib-less');

	// Default tasks.
	grunt.registerTask("serve", ["concurrent:watchers"]);
	// tslint disabled for now, gives 'Warning: Task "tslint:all" not found. Use --force to continue.'
	// Even with latest tslint.
	// grunt.registerTask('default', ["tslint:all", "ts:build"]);
	grunt.registerTask('default', ["ts:build", "less"]);
};
