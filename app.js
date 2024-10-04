// Function to get the access token from the URL
function getAccessTokenFromUrl() {
    const hash = window.location.hash;
    if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        return params.get('access_token');
    }
    return null;
}

// Function to handle OAuth flow
function handleOAuth() {
    const token = getAccessTokenFromUrl();
    if (token) {
        client.setAccessToken(token);
        populateDropdowns(); // Populate dropdowns after getting the token
    } else {
        // Redirect to authorization URL if no token found
        const clientId = '7e8e3254-775b-41c1-9859-6b69b7137fe3'; // Your Client ID
        const redirectUri = 'https://gmcglynn88.github.io/Schedule-Import/';
        window.location.href = `https://login.mypurecloud.ie/oauth/authorize?response_type=token&client_id=${clientId}&redirect_uri=${redirectUri}`;
    }
}

// Function to populate dropdowns
function populateDropdowns() {
    workforceInstance.getWorkforcemanagementAgentsMeManagementunit()
        .then((muData) => {
            console.log('Management Unit Data:', muData); // Log data for debugging
            const muSelect = document.getElementById('selectMu');
            const option = document.createElement('option');
            option.value = muData.managementUnit.id; // Ensure this is the correct property
            option.textContent = muData.managementUnit.name; // Ensure this is the correct property
            muSelect.appendChild(option);

            // Populate Business Units Dropdown
            populateBusinessUnits(muData.managementUnit.businessUnit.id); // Use correct property to get business unit ID
        })
        .catch(err => console.error('Error fetching management unit:', err));
}

// Function to populate Business Units
function populateBusinessUnits(businessUnitID) {
    workforceInstance.getWorkforcemanagementBusinessunits()
        .then((buData) => {
            console.log('Business Units Data:', buData); // Log data for debugging
            const buSelect = document.getElementById('selectBu');
            buData.forEach(unit => {
                const option = document.createElement('option');
                option.value = unit.id; // Ensure this is the correct property
                option.textContent = unit.name; // Ensure this is the correct property
                buSelect.appendChild(option);
            });
        })
        .catch(err => console.error('Error fetching business units:', err));
}

// Update Schedule Function
function updateSchedule() {
    workforceInstance.getWorkforcemanagementAgentsMeManagementunit()
        .then(muData => {
            const businessUnitID = muData.managementUnit.businessUnit.id; // Get business unit ID
            const agentID = muData.agent.id; // Get agent ID

            // Search for the agent's schedule
            const searchParams = {
                userIds: [agentID] // Searching by user ID
            };

            workforceInstance.postWorkforcemanagementBusinessunitsAgentschedulesSearch(businessUnitID, searchParams)
                .then(scheduleData => {
                    console.log('Schedule Data:', scheduleData); // Log schedule data
                    const scheduledID = scheduleData.entities[0].id; // Get the first schedule ID
                    const weekID = '2024-10-01'; // Replace with actual week ID

                    // Get shifts and activities of that schedule
                    workforceInstance.postWorkforcemanagementBusinessunitsWeeksSchedulesAgentschedulesQuery(businessUnitID, weekID, scheduledID)
                        .then(shiftData => {
                            console.log('Shift Data:', shiftData); // Log shift data

                            // Request an upload URL for the adjusted schedule
                            workforceInstance.postWorkforcemanagementBusinessunitsWeeksSchedulesUpdateUploadurl(businessUnitID, weekID, scheduledID)
                                .then(uploadData => {
                                    console.log('Upload URL:', uploadData.url);

                                    // Prepare adjusted schedule data (example structure)
                                    const adjustedScheduleData = {
                                        agentSchedules: [
                                            {
                                                userId: agentID,
                                                shifts: [
                                                    {
                                                        id: 'example-shift-id', // Replace with actual shift ID
                                                        manuallyEdited: true,
                                                        activities: shiftData.result.agentSchedules[0].shifts[0].activities // Adjust activities as needed
                                                    }
                                                ]
                                            }
                                        ]
                                    };

                                    // Upload the adjusted schedule
                                    fetch(uploadData.url, {
                                        method: 'PUT',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify(adjustedScheduleData)
                                    })
                                    .then(response => {
                                        if (response.ok) {
                                            console.log('Schedule updated successfully!');
                                        } else {
                                            console.error('Failed to update schedule:', response.statusText);
                                        }
                                    })
                                    .catch(err => console.error('Error updating schedule:', err));
                                })
                                .catch(err => console.error('Error requesting upload URL:', err));
                        })
                        .catch(err => console.error('Error fetching shift data:', err));
                })
                .catch(err => console.error('Error searching for agent schedule:', err));
        })
        .catch(err => console.error('Error fetching management unit:', err));
}

// Initial call to handle OAuth
handleOAuth();

// Add button listener for updating the schedule
document.getElementById('updateButton').addEventListener('click', updateSchedule);
