#!/bin/sh
browserify . -t ./browser/transforms.js -s pbf -o ./dist/osm-pbf.js
