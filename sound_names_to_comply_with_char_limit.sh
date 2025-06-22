#!/usr/bin/env bash

CHAR_LIMIT=80
SOUND_DIR=sounds

for f in $SOUND_DIR/*; do
    filename=$(basename -- "$f")
    dir=$(dirname -- "$f")
    ext=""
    name="$filename"
    if [[ "$filename" == *.* ]]; then
        ext=".${filename##*.}"
        name="${filename%.*}"
    fi
    max_name_length=$((CHAR_LIMIT - ${#ext}))
    if (( ${#filename} > CHAR_LIMIT )); then
        new_name="${name:0:max_name_length}$ext"
        mv -- "$f" "$dir/$new_name"
        echo "Renamed $filename to $new_name"
    else
        echo "$filename is within limit"
    fi
done