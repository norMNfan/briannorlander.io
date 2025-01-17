'use strict';

var autoprefixer = require("autoprefixer");
var beautify = require('gulp-jsbeautifier');
var browserSync = require('browser-sync').create();
var cache = require('gulp-cache');
var cp = require('child_process');
var cssnano = require('cssnano');
var cache = require('gulp-cache');
var changed = require('gulp-changed');
var del = require('del');
var es = require('event-stream');
var flatmap = require('gulp-flatmap');
var formatHtml = require('gulp-format-html');
var fs = require('fs');
var gm = require('gulp-gm');
var gulp = require('gulp');
var imagemin = require('gulp-imagemin');
var eslint = require('gulp-eslint');
var jshint = require('gulp-jshint');
var os = require('os');
var parallel = require('concurrent-transform');
var path = require('path');
var plumber = require('gulp-plumber');
var postcss = require("gulp-postcss");
var print = require("gulp-print").default;
var reload = browserSync.reload;
var rename = require('gulp-rename');
var sass = require('gulp-sass')(require('sass'));
var scsslint = require('gulp-scss-lint');
var sizeOf = require('image-size');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');

var jekyll = process.platform === 'win32' ? 'jekyll.bat' : 'jekyll';
var messages = {
    jekyllBuild: '<span style="color: grey">Running: </span> $ jekyll build --destination docs',
};
var responsiveSizes = [20, 400, 800, 1600];

/************
 **  SCSS  **
 ************/

gulp.task("scss:lint", function() {
    return gulp
        .src(["./_scss/**/*.scss", "!./_scss/lib/**/*.scss"])
        .pipe(plumber())
        .pipe(scsslint());
});

gulp.task("scss:build", function() {
    var plugins = [
        autoprefixer(["last 15 versions", "> 1%", "ie 8", "ie 7"], {
            cascade: true,
        }),
        cssnano({
            compatibility: "ie8"
        }),
    ];
    return gulp
        .src("./_scss/style.scss")
        .pipe(plumber())
        .pipe(rename({
            suffix: ".min"
        }))
        .pipe(sourcemaps.init())
        .pipe(
            sass({
                includePaths: ["scss"],
                onError: browserSync.notify,
                outputStyle: "compressed",
            })
        )
        .pipe(postcss(plugins))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest("./docs/css/"))
        .pipe(reload({
            stream: true
        }))
        .pipe(gulp.dest("./css/"));
});

gulp.task("scss", gulp.series("scss:lint", "scss:build"));

gulp.task("scss:optimized", function() {
    var plugins = [
        autoprefixer(["last 15 versions", "> 1%", "ie 8", "ie 7"], {
            cascade: true,
        }),
        cssnano({
            compatibility: "ie8"
        }),
    ];
    return gulp
        .src("./_scss/style.scss")
        .pipe(plumber())
        .pipe(rename({
            suffix: ".min"
        }))
        .pipe(
            sass({
                includePaths: ["scss"],
                outputStyle: "compressed",
            })
        )
        .pipe(postcss(plugins))
        .pipe(gulp.dest("./docs/css/"))
        .pipe(reload({
            stream: true
        }))
        .pipe(gulp.dest("./css/"));
});

/******************
 **  JavaScript  **
 ******************/

gulp.task('js:build', function() {
    return gulp.src('./_js/**/*.js')
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(uglify())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./docs/js/'))
        .pipe(reload({
            stream: true
        }))
        .pipe(gulp.dest('./js/'));
});

gulp.task("js:lint", function() {
    return gulp
        .src(["./_js/**/*.js", "!./_js/lib/**/*.js", "Gulpfile.js"])
        .pipe(plumber())
        .pipe(eslint())
        .pipe(jshint())
        .pipe(jshint.reporter("default"));
});

gulp.task('js', gulp.series('js:lint', 'js:build'));

/**********************
 ** Optimized Images **
 **********************/

gulp.task('images', function() {
    var dest = './img/';
    return gulp.src('./_img/**/*')
        .pipe(plumber())
        .pipe(changed(dest))
        .pipe(gulp.dest('./docs/img/'))
        .pipe(reload({
            stream: true
        }))
        .pipe(gulp.dest(dest));
});

gulp.task('images:optimized', function() {
    return gulp.src('./_img/**/*')
        .pipe(plumber())
        .pipe(cache(imagemin({
            interlaced: true,
            pngquant: true,
            progressive: true,
            multipass: true,
        })))
        .pipe(gulp.dest('./docs/img/'))
        .pipe(reload({
            stream: true
        }))
        .pipe(gulp.dest('./img/'));
});

/***********************
 ** Responsive Images **
 ***********************/

gulp.task('responsive:resize', function(done) {
    var srcSuffix, destSuffix;

    // Note: process.argv = ['node', 'path/to/gulpfile.js', 'responsive', '--dir', 'subPathIfProvided']
    var idx = process.argv.indexOf('--dir');
    if (idx > -1) {
        // Only process subdirectory
        var rawSrc = process.argv[idx + 1];
        var srcPath = path.join('./_img/res/raw/', rawSrc);
        if (fs.lstatSync(path.resolve(srcPath)).isDirectory()) {
            srcSuffix = path.join(rawSrc, '/**/*');
            destSuffix = rawSrc;
        } else {
            srcSuffix = rawSrc;
            destSuffix = rawSrc.substring(0, rawSrc.lastIndexOf("/"));
        }
    } else {
        srcSuffix = '**/*';
        destSuffix = '';
    }

    es.merge(
        responsiveSizes.map(function(size) {
            var dest = "./_img/res/" + size + "/" + destSuffix;
            return gulp
                .src("./_img/res/raw/" + srcSuffix)
                .pipe(plumber())
                .pipe(changed(dest))
                .pipe(
                    parallel(
                        gm(function(gmfile) {
                            if (gmfile.source.toLowerCase().endsWith("gif")) {
                                return gmfile; // Don't resize GIFs because...GraphicsMagick. :(
                            } else {
                                return gmfile.resize(null, size); // set height, variable width;
                            }
                        }),
                        os.cpus().length
                    )
                )
                .pipe(
                    print(function(filepath) {
                        return "Created: " + filepath.replace("/raw/", "/" + size + "/");
                    })
                )
                .pipe(gulp.dest(dest));
        })
    );

    done();
});

gulp.task('responsive:metadata', function() {
    // We always process all images.
    var metadata = {
        _NOTE: "This file is generated in gulpfile.js, in the responsive:metadata task.",
        aspectRatios: {},
        sizes: responsiveSizes,
    };
    var travelPhotos = {};
    return gulp.src('./_img/res/raw/**/*.{jpg,JPG,png,PNG,jpeg,JPEG,gif,GIF}')
        .pipe(flatmap(function(stream, file) {
            fs.readFile(file.path, function(err, buf) {
                if (err) {
                    process.stdout.write(err);
                    return;
                }
                var key = file.path.replace(/\\/g, '/').replace(/.*\/_img\/res\/raw\//, '');
                var dimensions = sizeOf(buf);
                metadata.aspectRatios[key] = Number((dimensions.width / dimensions.height).toFixed(3));
                if (key.startsWith('travel/')) {
                    var parts = key.split('.')[0].split("/");
                    var pageKey = parts[1];
                    var hash = parts.slice(2).join("-");
                    travelPhotos[key] = {
                        hash: hash,
                        pageKey: pageKey,
                    };
                }
            });
            return stream;
        }))
        .on('finish', function() {
            fs.writeFileSync('./_data/responsiveMetadata.json', JSON.stringify(metadata, null, 2));
            fs.writeFileSync('./_data/travelPhotos.json', JSON.stringify(travelPhotos, null, 2));
        });
});

gulp.task('responsive:clean', function(done) {
    var idx = process.argv.indexOf('--dir');
    var folders = (idx > -1) ? (
        responsiveSizes.map(function(size) {
            return '_img/res/' + size + '/' + process.argv[idx + 1];
        })
    ) : (['_img/res/*', '!_img/res/raw/', '!_img/res/raw/**']);

    return del(folders, done);
});

gulp.task('responsive',
    gulp.series(
        'responsive:clean',
        gulp.parallel('responsive:resize', 'responsive:metadata')
        // 'images'
    )
);

/************
 ** Jekyll **
 ************/

gulp.task('jekyll:build', function(cb) {
    browserSync.notify(messages.jekyllBuild);
    return cp.spawn(jekyll, ['build', '--quiet', '--incremental', '--destination', 'docs'], {
        stdio: 'inherit'
    }).on('close', cb);
});

gulp.task('jekyll:rebuild', gulp.series('jekyll:build', function(done) {
    reload();
    done();
}));

gulp.task('jekyll', gulp.series('jekyll:build'));

/**********************
 ** Formatting Files **
 **********************/

gulp.task('beautify', function() {
    return gulp.src(['./**/*.css', './**/*.html', './**/*.js', '!./docs'])
        .pipe(beautify())
        .pipe(gulp.dest('.'));
});

// TODO: Move up to another section
gulp.task('format', function() {
    return (
        gulp
        .src('_travel/*.html')
        .pipe(formatHtml())
        .pipe(gulp.dest('_travel/'))
    );
});

/******************
 ** Global Tasks **
 ******************/

gulp.task('clean', function() {
    return del(['./docs/', './css/', './js/', './img/']);
});

gulp.task('watch', function() {
    gulp.watch([
        './**/*.html',
        '!./docs/**/*.html',
        './_layouts/*.html',
        './_includes/*.html',
        './_drafts/*.html',
        './_posts/*',
        './_data/*',
        './_config.yml'
    ], gulp.series('jekyll:rebuild'));
    gulp.watch('./_scss/**/*.scss', gulp.series('scss'));
    // gulp.watch('./img/res/**/*', gulp.series('images'));
    gulp.watch(['./_js/**/*.js', 'Gulpfile.js'], gulp.series('js'));
});

gulp.task('build', gulp.series('clean', gulp.parallel('scss', /*'images',*/ 'js'), 'jekyll'));

gulp.task('build:optimized', gulp.series('clean', gulp.parallel('scss:optimized', /*'images',*/ 'js'), 'jekyll'));

// Moves all the files needed to build the site EXCEPT images
gulp.task('moveSite', function() {
    var dest = './docs/';
    return gulp.src('./docs/**/*')
        .pipe(plumber())
        .pipe(changed(dest))
        .pipe(gulp.dest('./docs/'))
        .pipe(reload({
            stream: true
        }))
        .pipe(gulp.dest(dest));
});

// Prepares files for deployment
gulp.task('deploy', gulp.series('beautify', 'build:optimized', function(done) {
    done();
}, 'images'));

// use default task to launch Browsersync and watch JS files
gulp.task('serve', gulp.series('build', function(done) {

    // Serve files from the root of this project
    browserSync.init(['./dist/**/*'], {
        ghostMode: {
            clicks: false,
            forms: false,
            scroll: false,
        },
        server: {
            baseDir: 'docs',
            routes: {
                "/img": "_img",
            }
        },
    });

    done();
}, 'watch'));

gulp.task('default', gulp.series('serve'));