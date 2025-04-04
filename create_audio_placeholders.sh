#!/bin/bash

# Create audio directory if it doesn't exist
mkdir -p audio

# List of audio files to create
FILES=(
    "ambient-loop.mp3"
    "melody-loop.mp3"
    "rhythm-loop.mp3"
    "bass-loop.mp3"
    "effects-loop.mp3"
    "complete.mp3"
)

# Create placeholder MP3 files if they don't exist
for file in "${FILES[@]}"; do
    if [ ! -f "audio/$file" ]; then
        echo "Creating placeholder for audio/$file"
        # This creates a 3-second silent MP3 file
        ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 3 -q:a 9 -acodec libmp3lame "audio/$file"
    else
        echo "File audio/$file already exists, skipping"
    fi
done

echo "Audio placeholders created successfully"
