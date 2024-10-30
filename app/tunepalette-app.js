document.addEventListener("DOMContentLoaded", () => {
    // General Functions

    // Error Output
    function createError(message) {
        let messageBox = document.createElement("div");
        messageBox.className = "error-box";
        let messageText = document.createElement("p");
        messageText.innerText = message;

        messageBox.appendChild(messageText);
        document.getElementById("content").appendChild(messageBox);
    }

    function createReturnButton() {
        let returnButton = document.createElement("a");
        returnButton.className = "medium-btn";
        returnButton.innerText = "Return";
        returnButton.href = "../";
        document.getElementById("content").appendChild(returnButton);
    }

    // Creating UI Elements
    function loadHTMLContent(filePath, callback) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', filePath, true);
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                callback(null, xhr.responseText);
            } else {
                callback(`Error loading ${filePath}: ${xhr.status}`, null);
            }
        };
        xhr.onerror = () => callback(`Error loading ${filePath}`, null);
        xhr.send();
    }

    // Display Methods
    // Repopulate artist list
    function displayTopArtists() {
        const artistList = document.getElementById('topArtistTable');
        artistList.innerHTML = '';
        let i = 0, row;

        topArtists.forEach(artist => {
            if (i % 5 === 0) {
                row = document.createElement('tr');
                artistList.appendChild(row);
            }

            const displayName = artist.name.length > 18 ? artist.name.substring(0, 15) + '...' : artist.name;
            const artistItem = document.createElement('td');
            artistItem.className = 'tableCard';
            artistItem.innerHTML = `
                <a href="https://open.spotify.com/artist/${artist.id}" target="_blank" rel="noopener noreferrer">
                    <img class="ImageMedium" src="${artist.images[0]?.url}" alt="${artist.name}">
                    <h1 class="detail_link">${displayName}</h1>
                </a>
            `;
            row.appendChild(artistItem);
            i++;
        });
    }

    // Repopulate track list
    function displayTopTracks() {
        const trackTableBody = document.getElementById('topTracksTable');
        trackTableBody.innerHTML = '';
        const headingRow = document.createElement('tr');
        headingRow.innerHTML = `
            <th>Cover</th>
            <th>#</th>
            <th>Title</th>
            <th>Length</th>
            <th>Artist</th>
        `;
        trackTableBody.appendChild(headingRow);
        topTracks.forEach((track, index) => {
            const trackRow = document.createElement('tr');
            const coverImageUrl = track.album.images.length > 0 ? track.album.images[0].url : '/res/no_image.png';
            trackRow.innerHTML = `
                <td><img class="track_cover" src="${coverImageUrl}" alt="${track.album.name}"></td>
                <td>${index + 1}</td>
                <td>${track.name}</td>
                <td style="color: #7F7F7F;">${track.duration_ms ? Math.floor(track.duration_ms / 60000) + ":" + ((track.duration_ms % 60000) / 1000).toFixed(0).padStart(2, '0') : ''}</td>
                <td style="color: #7F7F7F;">${track.artists.map(artist => artist.name).join(', ')}</td>
            `;
            trackTableBody.appendChild(trackRow);
        });
    }

    // Global Variables
    let topArtists = [];
    let topTracks = [];

    // Retrieve data from spotify with new information and repopulate artist list
    function fetchTopArtists(timeRange) {
        const accessToken = window.localStorage.getItem('access_token');
        fetch(`https://api.spotify.com/v1/me/top/artists?limit=30&time_range=${timeRange}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        .then(response => response.json())
        .then(data => {
            topArtists = data.items;
            displayTopArtists(); // Re-render artists with new data
        })
        .catch(error => createError('Failed to load top artists: ' + error));
    }

    // Retrieve data from spotify with new information and repopulate tracklist
    function fetchTopTracks(timeRange) {
        const accessToken = window.localStorage.getItem('access_token');
        fetch(`https://api.spotify.com/v1/me/top/tracks?limit=30&time_range=${timeRange}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        .then(response => response.json())
        .then(data => {
            topTracks = data.items;
            displayTopTracks();
        })
        .catch(error => createError('Failed to load top tracks: ' + error));
    }

    // Authentication and Data Retrieval
    const clientId = 'YOUR_CLIENT_ID'; 
    const redirectUri = 'YOUR_REDIRECT_URI'; 
    const tokenEndpoint = 'https://accounts.spotify.com/api/token';

    const getQueryParams = () => {
        const params = {};
        const queryString = window.location.search.substring(1);
        const regex = /([^&=]+)=([^&]*)/g;
        let m;
        while (m = regex.exec(queryString)) {
            params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
        }
        return params;
    };

    const params = getQueryParams();
    if (params.code) {
        const code = params.code;
        const codeVerifier = window.localStorage.getItem('code_verifier');

        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            client_id: clientId,
            code_verifier: codeVerifier
        });

        fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Token request failed with status ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.access_token) {
                const accessToken = data.access_token;
                window.localStorage.setItem('access_token', accessToken);
                loadHTMLContent('html/artists.html', (error, artistsHTML) => {
                    if (error) {
                        createError(error);
                        return;
                    }
                    document.getElementById('content').innerHTML += artistsHTML;

                    loadHTMLContent('html/tracks.html', (error, tracksHTML) => {
                        if (error) {
                            createError(error);
                            return;
                        }
                        document.getElementById('content').innerHTML += tracksHTML;

                        fetchTopArtists('medium_term');
                        fetchTopTracks('medium_term');

                        document.getElementById('topArtists-yearMode').addEventListener('click', () => fetchTopArtists('long_term'));
                        document.getElementById('topArtists-sixMnthMode').addEventListener('click', () => fetchTopArtists('medium_term'));
                        document.getElementById('topArtists-fourWeekMode').addEventListener('click', () => fetchTopArtists('short_term'));

                        document.getElementById('topTracks-yearMode').addEventListener('click', () => fetchTopTracks('long_term'));
                        document.getElementById('topTracks-sixMnthMode').addEventListener('click', () => fetchTopTracks('medium_term'));
                        document.getElementById('topTracks-fourWeekMode').addEventListener('click', () => fetchTopTracks('short_term'));
                    });
                });
            } else {
                createError('Failed to retrieve access token');
                createReturnButton();
            }
        })
        .catch(error => {
            createError('Login Again: ' + error);
            createReturnButton();
        });
    } else {
        createError("No Authorization Code Found - Try logging in again?");
        createReturnButton();
    }
});
