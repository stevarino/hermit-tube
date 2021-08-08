#!/env/bin/python

"""
check_version.py - compares cubedtube version in requirements to installed, 
updating if necessary.
"""

import re
import subprocess
import sys

with open('requirements.txt', 'r') as fp:
    req = fp.read()

def get_version(content):
    return re.search(r'cubedtube.*?(\d+\.\d+\.\d+)', content)

def parse_version(version: str):
    return tuple(int(part) for part in version.split('.'))

match = get_version(req)
if not match:
    print('Requirements unable to be checked')
    sys.exit(1)

print(f'Reuqested version is: {match[1]}')

installed = subprocess.check_output([sys.executable, '-m', 'pip', 'freeze'])

installed_match = get_version(installed.decode('utf-8'))
if not installed_match:
    print('Unable to determine installed version')
    sys.exit(1)

print(f'Installed version is {installed_match[1]}')
if parse_version(match[1]) <= parse_version(installed_match[1]):
    print('Version is up to date.')
    sys.exit(0)

subprocess.check_call([
    sys.executable, '-m', 'pip', 'install', f'cubedtube=={match[1]}'])
