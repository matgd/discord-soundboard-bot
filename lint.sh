#!/bin/bash

shopt -s extglob
npx pretter **/*.js !(node_modules)
shopt -u extglob
