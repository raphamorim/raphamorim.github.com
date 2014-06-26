module.exports = function(grunt) {
  grunt.initConfig({
    lintspaces: {
      all: {
        src: [
          '*', '_includes/*', '_layouts/*', '_plugins/*', '_posts/*'
        ],
        options: {
          newline: false,
          trailingspaces: true,
          indentation: 'spaces',
          spaces: 2
        }
      }
    }
  });

  [ 'grunt-lintspaces' ].forEach(grunt.loadNpmTasks);
};
