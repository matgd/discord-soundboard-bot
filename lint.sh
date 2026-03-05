#!/bin/bash

shopt -s extglob
npx prettier **/*.js !(node_modules)
shopt -u extglob
