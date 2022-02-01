#!/bin/bash

# This script deletes hero_images that should not be.

# 1. Get all used images
usedImages="$(grep -rn '_travel' -e 'resimg.html' | awk -F 'travel/' '{print $3}' | awk -F '"' '{print $1}')"
heroImages="" # TODO

# 2. Get all stored images
storedImages="$(find -E _img/res/raw/travel -regex '.*\.(jpg)' | awk -F '/' '{print $(NF-1)"/"$NF}')"

count=0

# 3. For each stored image
for storedImage in $storedImages
do
    storedImageFilename="$(echo $storedImage | awk -F '/' '{print $NF}')"

    found="$(echo $usedImages | grep -e "$storedImageFilename" | wc -l)"

    # 3a. If $storedImage is not in $usedImages, delete
    if [[ "$found" -eq 0 ]]; then
        if [[ ! $storedImageFilename =~ "_featured" ]]; then
            echo "_img/res/raw/travel/$storedImage"
            rm -f "_img/res/raw/travel/$storedImage"
            count=$((count+1))
        fi
    fi
done

echo "$count images deleted"