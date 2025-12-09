# Setting Up PostgreSQL Credential in n8n

## Step-by-Step Visual Guide

### Step 1: Open n8n Credentials Page

1. Go to https://n8n.suzarilshah.cf
2. Click the **hamburger menu** (☰) in the top-left corner
3. Click **Settings** (gear icon)
4. Click **Credentials** in the left sidebar

### Step 2: Add New Credential

1. Click the **+ Add Credential** button (top-right)
2. In the search box, type: `Postgres`
3. Click on **Postgres** when it appears

### Step 3: Fill in the Connection Details

Use these exact values for your Neon database:

| Field | Value |
|-------|-------|
| **Credential Name** | `Octo Neon Database` |
| **Host** | `ep-rough-base-a8o696s7-pooler.eastus2.azure.neon.tech` |
| **Database** | `neondb` |
| **User** | `neondb_owner` |
| **Password** | `npg_HzwxYc0l7bUG` |
| **Port** | `5432` |
| **SSL** | Toggle ON ✅ |

### Step 4: Test the Connection

1. Click the **Test Connection** button at the bottom
2. Wait for the green checkmark ✅
3. If it fails, double-check:
   - SSL is enabled
   - No extra spaces in the values
   - The password is correct

### Step 5: Save the Credential

1. Click **Save** button
2. You should see "Credential saved successfully"

### Step 6: Get the Credential ID

After saving, you need the credential ID for the workflow:

1. The URL will look like: `https://n8n.suzarilshah.cf/credentials/XXXXX`
2. Copy the ID (the `XXXXX` part)
3. Update the workflow JSON or use n8n's credential selector

---

## Alternative: Using n8n UI to Link Credentials

If you already imported the workflow:

1. Open the workflow
2. Click on any **PostgreSQL node** (e.g., "Create Job Record")
3. In the node settings, find **Credential to connect with**
4. Click the dropdown
5. Select **Octo Neon Database** (the one you just created)
6. Click **Save**
7. Repeat for ALL PostgreSQL nodes in the workflow:
   - Create Job Record
   - Save Scene to DB
   - Update Scene Complete
   - Update Movie Progress
   - Update Movie Complete
   - Update Job Complete
   - Update Scene Failed

---

## Troubleshooting

### "Connection refused" error
- Make sure SSL is enabled
- Neon requires SSL for all connections

### "Authentication failed" error
- Double-check the password: `npg_HzwxYc0l7bUG`
- Make sure user is: `neondb_owner`

### "Database does not exist" error
- Database name should be: `neondb`
- Check for typos

### "Timeout" error
- Neon databases auto-suspend after 5 minutes of inactivity
- The first connection might take 2-3 seconds to "wake up"
- Click **Test Connection** again
