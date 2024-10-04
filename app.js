document.addEventListener('DOMContentLoaded', () => {
    const token = getAccessTokenFromUrl();
    if (token) {
        client.setAccessToken(token);
        populateDropdowns(); // Populate dropdowns after getting the token
    } else {
        // Redirect to authorization URL if no token found
        window.location.href = `https://login.mypurecloud.ie/oauth/authorize?response_type=token&client_id=7e8e3254-775b-41c1-9859-6b69b7137fe3&redirect_uri=https://gmcglynn88.github.io/Schedule-Import/`;
    }
});

// Function to extract access token from URL
function getAccessTokenFromUrl() {
    const hash = window.location.hash;
    if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        return params.get('access_token');
    }
    return null;
}

// Function to populate the dropdowns
function populateDropdowns() {
    // Populate Management Units Dropdown
    workforceInstance.getWorkforcemanagementAgentsMeManagementunit()
        .then((muData) => {
            const muSelect = document.getElementById('selectMu');
            const agentID = muData.agent.id;
            const businessUnitID = muData.businessUnit.id;

            // Populate Management Unit Dropdown
            const option = document.createElement('option');
            option.value = muData.managementUnit.id;
            option.textContent = muData.managementUnit.name;
            muSelect.appendChild(option);
        })
        .catch(err => console.error('Error fetching management unit:', err));
}

// Update Schedule Function
function updateSchedule() {
    workforceInstance.getWorkforcemanagementAgentsMeManagementunit()
        .then(muData => {
            const businessUnitID = muData.businessUnit.id; // Get business unit ID
            const agentID = muData.agent.id; // Get agent ID

            // Search for the agent's schedule
            const searchParams = {
                userIds: [agentID] // Searching by user ID
            };

            workforceInstance.postWorkforcemanagementBusinessunitAgentschedulesSearch(businessUnitID, searchParams)
                .then(scheduleData => {
                    const scheduledID = scheduleData.entities[0].id; // Get the first schedule ID
                    const weekID = '2024-10-01'; // Replace with actual week ID

                    // Get shifts and activities of that schedule
                    workforceInstance.postWorkforcemanagementBusinessunitWeekScheduleAgentschedulesQuery(businessUnitID, weekID, scheduledID)
                        .then(shiftData => {
                            console.log('Shift Data:', shiftData);

                            // Request an upload URL for the adjusted schedule
                            workforceInstance.postWorkforcemanagementBusinessunitWeekScheduleUpdateUploadurl(businessUnitID, weekID, scheduledID)
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

// Add button listener for updating the schedule
document.getElementById('updateButton').addEventListener('click', updateSchedule);
