# Appwrite Database Setup for Cost Tracking

## Database Collection Setup

You need to create a collection in your Appwrite database to track video generation costs.

### Collection Details

**Database ID**: `lemongrab_db` (should already exist)
**Collection ID**: `video_generations`

### Attributes

Create the following attributes in the `video_generations` collection:

1. **prompt** (String, required)
   - Size: 1000
   - Description: The video generation prompt

2. **soraModel** (String, required)
   - Size: 20
   - Description: The Sora model used (sora-1 or sora-2)

3. **duration** (Integer, required)
   - Description: Video duration in seconds

4. **resolution** (String, required)
   - Size: 20
   - Description: Video resolution (e.g., "1280x720")

5. **variants** (Integer, required)
   - Description: Number of variants generated

6. **generationMode** (String, required)
   - Size: 50
   - Description: Generation mode (text-to-video, image-to-video, video-to-video)

7. **estimatedCost** (Float, required)
   - Description: Estimated cost in USD

8. **videoId** (String, optional)
   - Size: 100
   - Description: The Azure video ID

### Permissions

Set the following permissions:
- **Create**: Any authenticated user
- **Read**: Any authenticated user (or restrict to document creator)
- **Update**: Document creator only
- **Delete**: Document creator only

### Steps to Create in Appwrite Console

1. Go to your Appwrite Console
2. Navigate to Databases → `lemongrab_db`
3. Click "Create Collection"
4. Set Collection ID to `video_generations`
5. Add each attribute listed above
6. Set the permissions as specified
7. Save the collection

After creating this collection, the Cost Tracking feature will work automatically.
