[briannorlander.com](briannorlander.com)
========================================

[briannorlander.com](briannorlander.com) is built using [Gulp][gulp], [Jekyll][jekyll], and [SCSS][scss].

- Use [Jekyll][jekyll] for content management and templating.
- Use [ImageMagick][imagemagick] to resize images for responsive / retina loading.
- Use [SCSS][scss] to keep our CSS organized into logical components.
- Use [Autoprefixer][autoprefixer] to automatically insert browser prefixes where necessary to handle cross browser compatibility.
- Use [Browsersync][browsersync] to automatically launch a development version of our website, reload the page whenever we change the HTML, and inject changes to CSS, JavaScript, and images with needing to reload.
- Use [HTML Minifier][htmlmin], [CSSNano][cssnano], [UglifyJS][uglifyjs], and [ImageMin][imagemin] to compress and optimize our HTML, CSS, JavaScript, and images, respectively.
- Use [SCSS-Lint][scss-lint], [JSHint][jshint], and [JSCS][jscs] to perform [linting][linting] and style checking on our SCSS and JavaScript files.

All with one command from the terminal:

```bash
gulp serve
```
