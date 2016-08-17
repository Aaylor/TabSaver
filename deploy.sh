#!/bin/bash

test ! type zip >/dev/null 2>&1 || {
    echo "\`zip' binary is not installed." >&2
    echo "Impossible to deploy." >&2
}

FILES=( README.md css deploy.sh img js manifest.json tabsaver.html )

zip tabsaver.zip ${FILES[@]}
