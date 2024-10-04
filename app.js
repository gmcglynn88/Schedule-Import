// Main script for Adjusting Agent's Schedule

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
        populateDropdowns(token); // Populate dropdowns after getting the token
    } else {
        // Redirect to authorization URL if no token found
        const clientId = '7e8e3254-775b-41c1-9859-6b69b7137fe3'; // Your Client ID
        const redirectUri = 'https://gmcglynn88.github.io/Schedule-Import/';
        const responseType = 'token';
        window.location.href = `https://login.mypurecloud.ie/oauth/authorize?client_id=${clientId}&response_type=${responseType}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    }
}

// Function to populate dropdowns
async function populateDropdowns(token) {
    try {
        const managementUnitData = await fetchManagementUnit(token);
        const businessUnitID = managementUnitData.businessUnit.id;

        // Populate the management unit dropdown
        const muSelect = document.getElementById('selectMu');
        const muOption = document.createElement('option');
        muOption.value = managementUnitData.managementUnit.id;
        muOption.textContent = managementUnitData.managementUnit.name;
        muSelect.appendChild(muOption);

        // Populate Business Units Dropdown
        const businessUnits = await fetchBusinessUnits(token);
        const buSelect = document.getElementById('selectBu');
        businessUnits.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit.id;
            option.textContent = unit.name;
            buSelect.appendChild(option);
        });

    } catch (error) {
        console.error('Error populating dropdowns:', error);
        document.getElementById('statusMessage').innerText = `Error loading data: ${error.message}`;
    }
}

// Function to fetch management unit data
async function fetchManagementUnit(token) {
    const response = await fetch('https://api.mypurecloud.ie/api/v2/workforcemanagement/agents/me/managementunit', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        throw new Error(`Error fetching management unit: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

// Function to fetch business units
async function fetchBusinessUnits(token) {
    const response = await fetch('https://api.mypurecloud.ie/api/v2/workforcemanagement/businessunits', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        throw new Error(`Error fetching business units: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

// Update Schedule Function
async function updateSchedule() {
    // Similar to the previous version, implement your logic for updating the schedule.
}

// Initial call to handle OAuth
handleOAuth();

// Add button listener for updating the schedule
document.getElementById('updateButton').addEventListener('click', updateSchedule);
