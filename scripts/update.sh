#!/bin/bash

###########################################################
# update.sh
# 
# Runs cubedtube scraper and frontend commands, copying
# the output to /var/www/{site_name}/html
###########################################################

set -e

cd "$(dirname "$0")/.."

venv="ht_prod"

git pull
../$venv/bin/python scripts/check_version.py
echo ''
date +'%Y%m%d %H:%M:%S'
echo "Scanning YouTube..."
../$venv/bin/cubedtube scraper --quota 60
echo "Rendering site..."
../$venv/bin/cubedtube frontend
rsync -cri output/ "/var/www/$(../$venv/bin/cubedtube site_name)/html/"