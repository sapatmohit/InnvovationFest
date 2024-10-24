// Global variables
let map;
let markers = [];
let routeLayer;
let searchResults = {};

const availableRides = [
	{
		from: 'Berkeley Campus',
		to: 'San Francisco Downtown',
		date: '2024-10-25',
		time: '10:00 AM',
		price: '$20',
		seatsAvailable: 3,
		driver: 'John Doe',
		vehicle: 'Toyota Prius',
	},
	{
		from: 'Stanford University',
		to: 'San Francisco Downtown',
		date: '2024-10-25',
		time: '2:00 PM',
		price: '$15',
		seatsAvailable: 1,
		driver: 'Jane Smith',
		vehicle: 'Honda Accord',
	},
];

// Initialize map and autocomplete
document.addEventListener('DOMContentLoaded', () => {
	feather.replace();
	initMap();
	initAutocomplete();
});

// Initialize map
function initMap() {
	map = L.map('map').setView([37.7749, -122.4194], 10);
	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: '© OpenStreetMap contributors',
	}).addTo(map);
}

// Initialize autocomplete for location inputs
function initAutocomplete() {
	const fromInput = document.querySelector('input[name="from"]');
	const toInput = document.querySelector('input[name="to"]');

	setupAutocomplete(fromInput, 'from');
	setupAutocomplete(toInput, 'to');
}

// Setup autocomplete for an input
function setupAutocomplete(input, type) {
	let autocompleteList = document.createElement('div');
	autocompleteList.className = 'autocomplete-items hidden';
	input.parentNode.appendChild(autocompleteList);

	input.addEventListener(
		'input',
		debounce(async (e) => {
			const value = e.target.value;
			if (value.length < 3) {
				autocompleteList.innerHTML = '';
				autocompleteList.classList.add('hidden');
				return;
			}

			// Show loading state
			autocompleteList.innerHTML =
				'<div class="p-4"><div class="loading-spinner"></div></div>';
			autocompleteList.classList.remove('hidden');

			try {
				const locations = await searchLocation(value);
				displayAutocompleteResults(locations, autocompleteList, input, type);
			} catch (error) {
				autocompleteList.innerHTML =
					'<div class="p-4 text-red-500">Error fetching locations</div>';
			}
		}, 300)
	);

	// Hide autocomplete on click outside
	document.addEventListener('click', (e) => {
		if (!input.contains(e.target)) {
			autocompleteList.classList.add('hidden');
		}
	});
}

// Display autocomplete results
function displayAutocompleteResults(locations, autocompleteList, input, type) {
	autocompleteList.innerHTML = '';

	if (locations.length === 0) {
		autocompleteList.innerHTML = '<div class="p-4">No results found</div>';
		return;
	}

	locations.forEach((location) => {
		const item = document.createElement('div');
		item.className = 'autocomplete-item';
		item.innerHTML = `
            <div class="flex items-center">
                <i data-feather="map-pin" class="h-4 w-4 mr-2"></i>
                <div>
                    <div class="font-medium">${location.name}</div>
                    <div class="text-sm text-gray-500">${location.address}</div>
                </div>
            </div>
        `;

		item.addEventListener('click', () => {
			input.value = location.name;
			searchResults[type] = location;
			autocompleteList.classList.add('hidden');
			updateMap();
		});

		autocompleteList.appendChild(item);
	});

	feather.replace();
}

// Update map with selected locations
function updateMap() {
	// Clear existing markers and route
	markers.forEach((marker) => map.removeMarker(marker));
	markers = [];
	if (routeLayer) map.removeLayer(routeLayer);

	if (searchResults.from) {
		const fromMarker = L.marker([
			searchResults.from.lat,
			searchResults.from.lng,
		])
			.addTo(map)
			.bindPopup(searchResults.from.name);
		markers.push(fromMarker);
	}

	if (searchResults.to) {
		const toMarker = L.marker([searchResults.to.lat, searchResults.to.lng])
			.addTo(map)
			.bindPopup(searchResults.to.name);
		markers.push(toMarker);
	}

	// If both locations are selected, draw route and fit bounds
	if (searchResults.from && searchResults.to) {
		drawRoute(searchResults.from, searchResults.to);
		const bounds = L.latLngBounds([
			[searchResults.from.lat, searchResults.from.lng],
			[searchResults.to.lat, searchResults.to.lng],
		]);
		map.fitBounds(bounds, { padding: [50, 50] });
	}
}

// Draw route between two points
async function drawRoute(from, to) {
	try {
		const response = await fetch(
			`https://router.project-osrm.org/route/v1/driving/` +
				`${from.lng},${from.lat};${to.lng},${to.lat}` +
				`?overview=full&geometries=geojson`
		);
		const data = await response.json();

		if (routeLayer) map.removeLayer(routeLayer);

		if (data.routes && data.routes[0]) {
			routeLayer = L.geoJSON(data.routes[0].geometry, {
				style: {
					color: '#2563eb',
					weight: 4,
					opacity: 0.7,
				},
			}).addTo(map);

			// Add route information
			updateRouteInfo(data.routes[0]);
		}
	} catch (error) {
		console.error('Error drawing route:', error);
	}
}

// Update route information display
function updateRouteInfo(route) {
	const distance = (route.distance / 1000).toFixed(1); // Convert to km
	const duration = Math.round(route.duration / 60); // Convert to minutes

	const routeInfoDiv = document.createElement('div');
	routeInfoDiv.className = 'route-info';
	routeInfoDiv.innerHTML = `
        <div class="text-sm font-medium">Route Information</div>
        <div class="text-gray-600">
            <div class="mt-2">
                <i data-feather="navigation" class="inline h-4 w-4 mr-1"></i>
                Distance: ${distance} km
            </div>
            <div class="mt-1">
                <i data-feather="clock" class="inline h-4 w-4 mr-1"></i>
                Duration: ${duration} min
            </div>
        </div>
    `;

	const existingRouteInfo = document.querySelector('.route-info');
	if (existingRouteInfo) existingRouteInfo.remove();

	document.querySelector('#map').appendChild(routeInfoDiv);
	feather.replace();
}

// Mock location search function (replace with real API in production)
async function searchLocation(query) {
	// Simulate API delay
	await new Promise((resolve) => setTimeout(resolve, 500));

	// Mock location data
	const mockLocations = [
		{
			name: 'Berkeley Campus',
			address: 'Berkeley, CA 94720',
			lat: 37.8715,
			lng: -122.273,
		},
		{
			name: 'Stanford University',
			address: 'Stanford, CA 94305',
			lat: 37.4275,
			lng: -122.1697,
		},
		{
			name: 'San Francisco Downtown',
			address: 'San Francisco, CA',
			lat: 37.7749,
			lng: -122.4194,
		},
	];

	// Filter locations based on query
	return mockLocations.filter(
		(location) =>
			location.name.toLowerCase().includes(query.toLowerCase()) ||
			location.address.toLowerCase().includes(query.toLowerCase())
	);
}

// Utility function for debouncing
function debounce(func, wait) {
	let timeout;
	return function executedFunction(...args) {
		const later = () => {
			clearTimeout(timeout);
			func(...args);
		};
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

// Handle form submission
document.getElementById('searchForm').addEventListener('submit', async (e) => {
	e.preventDefault();

	if (!searchResults.from || !searchResults.to) {
		alert('Please select both pickup and destination locations');
		return;
	}

	const formData = new FormData(e.target);
	const searchCriteria = {
		...Object.fromEntries(formData),
		fromLocation: searchResults.from,
		toLocation: searchResults.to,
	};

	// Filter available rides based on search criteria
	const filteredRides = filterRides(searchCriteria);
	updateRidesList(filteredRides);
});

// Filter rides based on search criteria
function filterRides(criteria) {
	return availableRides.filter((ride) => {
		const dateMatch = !criteria.date || ride.date === criteria.date;
		const timeMatch = !criteria.time || ride.time === criteria.time;
		const fromMatch = ride.from
			.toLowerCase()
			.includes(criteria.fromLocation.name.toLowerCase());
		const toMatch = ride.to
			.toLowerCase()
			.includes(criteria.toLocation.name.toLowerCase());

		return dateMatch && timeMatch && fromMatch && toMatch;
	});
}

// Update rides list display
function updateRidesList(rides) {
	const container = document.getElementById('ridesContainer');
	container.innerHTML = '';

	if (rides.length === 0) {
		container.innerHTML = `
            <div class="col-span-full text-center py-8">
                <div class="text-gray-500">No rides found matching your criteria</div>
            </div>
        `;
		return;
	}

	rides.forEach((ride) => {
		container.appendChild(createRideCard(ride));
	});
	feather.replace();
}

function createRideCard(ride) {
	const rideCard = document.createElement('div');
	rideCard.className = 'ride-card p-4 bg-white rounded-lg shadow-md mb-4';

	rideCard.innerHTML = `
		 <div class="flex justify-between items-center">
			  <div>
					<div class="font-semibold text-lg">${ride.from} ➔ ${ride.to}</div>
					<div class="text-gray-500">${ride.date} at ${ride.time}</div>
			  </div>
			  <div class="text-right">
					<div class="text-blue-500 font-semibold">${ride.price}</div>
					<div class="text-sm text-gray-500">${ride.seatsAvailable} seats available</div>
			  </div>
		 </div>
		 <div class="mt-2 text-gray-500">
			  <i data-feather="user" class="h-4 w-4 inline"></i> Driver: ${ride.driver}
			  <br>
			  <i data-feather="truck" class="h-4 w-4 inline"></i> Vehicle: ${ride.vehicle}
		 </div>
		 <button class="mt-4 button-primary text-white px-4 py-2 rounded-lg w-full">
			  Book Ride
		 </button>
	`;

	return rideCard;
}
function updateRidesList(rides) {
	const container = document.getElementById('ridesContainer');
	container.innerHTML = ''; // Clear previous results

	if (rides.length === 0) {
		container.innerHTML = `
			  <div class="col-span-full text-center py-8">
					<div class="text-gray-500">No rides found matching your criteria</div>
			  </div>
		 `;
		return;
	}

	// Append ride cards to the container
	rides.forEach((ride) => {
		container.appendChild(createRideCard(ride));
	});

	feather.replace(); // Refresh icons
}
