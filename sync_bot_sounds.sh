#!/bin/bash

LOCAL_DIR="/mnt/c/Users/matgo/Documents/REAPER Media/RPI_AUDIO_SYNC_LOCAL/"
REMOTE_HOST="dietpi@192.168.0.15"
REMOTE_DIR="/home/dietpi/discord-soundboard-bot/sounds/"

# Check if the local directory exists
if [ ! -d "$LOCAL_DIR" ]; then
    echo "Local directory '$LOCAL_DIR' does not exist."
    exit 1
fi

# Check if the remote directory exists
ssh -q $REMOTE_HOST "test -d $REMOTE_DIR"
if [ $? -ne 0 ]; then
    echo "Remote directory '$REMOTE_DIR' does not exist on '$REMOTE_HOST'."
    exit 2
fi

rsync -chavzP --stats --delete "$LOCAL_DIR" "$REMOTE_HOST:$REMOTE_DIR"
