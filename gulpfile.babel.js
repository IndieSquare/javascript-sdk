const gulp = require('gulp');
const webpack = require('gulp-webpack');
const derequire = require('gulp-derequire');
const clean = require('gulp-clean');
const babel = require('gulp-babel');
const sourcemaps = require('gulp-sourcemaps');
const replace = require('gulp-replace');
const mocha = require('gulp-mocha');

const browserify = require('browserify');
const source = require('vinyl-source-stream');
const runSequence = require('run-sequence');
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');

gulp.task('clean', () => {
  return gulp.src(['lib', 'dist'], { read: false })
    .pipe(clean());
});

gulp.task('babel', () => {
  return gulp.src('src/index.js')
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(replace('exports.default = IndieSquare;', 'module.exports = IndieSquare;'))
    .pipe(replace("require('../node_modules/whatwg-fetch');", "var fetch = require('node-fetch');"))
    .pipe(replace('../node_modules/mobile-detect', 'mobile-detect'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('lib'));
});

gulp.task('browserify-pre', () => {
  return gulp.src('lib/index.js')
    .pipe(replace("var fetch = require('node-fetch');", "require('whatwg-fetch');"))
    .pipe(gulp.dest('temp'));
});

gulp.task('browserify', () => {
  let bundleStream = browserify({entries: 'temp/index.js', standalone: 'IndieSquare'}).bundle();
  return bundleStream
    .pipe(source('indiesquare.js'))
    .pipe(derequire())
    .pipe(gulp.dest('dist'));
});

gulp.task('browserify-post', () => {
  return gulp.src(['temp'], { read: false })
    .pipe(clean());
});

gulp.task('uglify', () => {
  return gulp.src('dist/indiesquare.js')
    .pipe(uglify())
    .pipe(rename('indiesquare.min.js'))
    .pipe(gulp.dest('dist'))
});

gulp.task('releasetest', () => {
  return gulp.src('test/release.test.js', { read: false })
    .pipe(mocha({ reporter: 'spec', timeout: 100000 }));
});

gulp.task('default', (done) => {
  runSequence('clean', 'babel', 'browserify-pre', 'browserify', 'browserify-post', 'uglify', done);
});

gulp.task('release', (done) => {
  runSequence('clean', 'babel', 'releasetest', 'browserify-pre', 'browserify', 'browserify-post', 'uglify', done);
});