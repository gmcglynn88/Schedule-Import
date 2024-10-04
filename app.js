document.addEventListener('DOMContentLoaded', () => {
    getAccessToken().then(token => {
        client.setAccessToken(token);
        populateDropdowns(); // Populate dropdowns after getting the token
    });
});

// Function to get an OAuth access token
async function getAccessToken() {
    const response = await fetch('https://api.mypurecloud.ie/oauth/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: '7e8e3254-775b-41c1-9859-6b69b7137fe3',
            client_secret: 'THM3BwNmWr-imk-qJyFa5zk9pB7rqjDN3-K2TMa17IQ'
        })
    });

    if (!response.ok) {
        throw new Error('Failed to get access token');
    }
    const data = await response.json();
    return data.access_token;
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

// Button to trigger updateSchedule function
document.getElementById('updateButton').addEventListener('click', updateSchedule);
