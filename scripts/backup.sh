#!/bin/bash
# Backup script for Fuchitron - run before each deploy
BACKUP_DIR="$(dirname "$0")/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR/$TIMESTAMP"
cp app.js "$BACKUP_DIR/$TIMESTAMP/"
cp styles.css "$BACKUP_DIR/$TIMESTAMP/"
cp index.html "$BACKUP_DIR/$TIMESTAMP/"
echo "Backup saved: $BACKUP_DIR/$TIMESTAMP"
