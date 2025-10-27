# Fix Video Permissions Migration

This is a one-time migration function to add public read permissions to existing videos in the storage bucket.

## Purpose

Retroactively adds `Permission.read(Role.any())` to all video files that were uploaded before the permission fix, allowing them to be viewed and downloaded without authentication errors.

## Usage

Call this function once via the Dashboard after deployment:
1. The function will list all files in the bucket
2. Check each file's permissions
3. Add public read if not already present
4. Report results (processed, updated, already public, errors)

## Safety

- Only adds permissions, never removes existing ones
- Skips files that already have public read
- Provides detailed logging and error reporting
- Can be run multiple times safely (idempotent)
