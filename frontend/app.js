/* ==============================
   GLOBAL STATE
============================== */

let currentSecret = null;
let missedLocations = new Set();
let reachedLocations = new Set();

let activeTargetId = 1;
let countdownInterval = null;
let endTime = null;

let userLat = null;
let userLng = null;
let geoWatchId = null;

/* ==============================
   COUNTDOWN TIMES (seconds)
============================== */

const COUNTDOWN_MAP = {
    1: 15 * 60,
    2: 15 * 60,
    3: 60 * 60,
    4: 75 * 60,
    5: 45 * 60,
    6: 45 * 60
};

/* ==============================
   FIREBASE CONFIG
============================== */

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_DOMAIN",
    databaseURL: "YOUR_DB_URL",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

/* ==============================
   GPS TRACKING
============================== */

function startGlobalTracking() {

    if (!navigator.geolocation) {
        alert("Geolocation not supported.");
        return;
    }

    if (geoWatchId !== null) return;

    geoWatchId = navigator.geolocation.watchPosition(position => {

        userLat = position.coords.latitude;
        userLng = position.coords.longitude;
        updateLiveDistance();

    }, error => {
        console.log(error);
    }, {
        enableHighAccuracy: true,
        maximumAge: 0
    });
}

/* ==============================
   DISTANCE CALCULATION
============================== */

function calculateDistance(lat1, lon1, lat2, lon2) {

    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/* ==============================
   LOAD SECRET FROM FIREBASE
============================== */

function loadSecretFromBackend(secretId) {

    db.ref("secretlocations/" + secretId).once("value")
        .then(snapshot => {

            const data = snapshot.val();
            if (!data) return;

            currentSecret = {
                lat: data.lat,
                lng: data.lng,
                hint: data.hint
            };

            activateHint(secretId);
        });
}

/* ==============================
   LIVE DISTANCE UPDATE
============================== */

function updateLiveDistance() {

    if (!currentSecret) return;

    if (reachedLocations.has(activeTargetId) ||
        missedLocations.has(activeTargetId)) {
        return;
    }

    if (userLat === null || userLng === null) return;

    const counter = document.getElementById(`counter${activeTargetId}`);
    if (!counter) return;

    const distanceEl = counter.querySelector('.distance');

    const distance = calculateDistance(
        userLat,
        userLng,
        currentSecret.lat,
        currentSecret.lng
    );

    distanceEl.textContent = `${distance.toFixed(3)} km`;

    const successRadius = activeTargetId <= 4 ? 0.05 : 0.3;

    if (distance < successRadius) {
        reachCurrent();
    }
}

/* ==============================
   ACTIVATE SECRET
============================== */

function activateHint(locationId) {

    activeTargetId = locationId;

    const counter = document.getElementById(`counter${locationId}`);

    counter.classList.remove('locked', 'success', 'missed');
    counter.classList.add('active');

    if (currentSecret) {
        counter.querySelector('.hint').textContent = currentSecret.hint;
    }

    counter.querySelector('.distance').textContent = "Tracking...";

    let countdownEl = document.getElementById(`countdown${locationId}`);

    if (!countdownEl) {
        countdownEl = document.createElement('div');
        countdownEl.id = `countdown${locationId}`;
        countdownEl.className = 'countdown';
        counter.appendChild(countdownEl);
    }

    startCountdown(locationId);
}

/* ==============================
   COUNTDOWN SYSTEM
============================== */

function startCountdown(locationId) {

    const countdownEl = document.getElementById(`countdown${locationId}`);

    if (countdownInterval) clearInterval(countdownInterval);

    if (!endTime) {
        endTime = Date.now() + (COUNTDOWN_MAP[locationId] * 1000);
        localStorage.setItem("activeTargetId", locationId);
        localStorage.setItem("endTime", endTime);
    }

    if (Date.now() >= endTime) {
        missLocation(locationId);
        return;
    }

    runRealTimer(locationId, countdownEl);
}

function runRealTimer(locationId, countdownEl) {

    countdownInterval = setInterval(() => {

        const remaining = Math.floor((endTime - Date.now()) / 1000);

        if (remaining <= 0) {
            clearInterval(countdownInterval);
            missLocation(locationId);
            return;
        }

        updateCountdownDisplay(countdownEl, remaining);

    }, 1000);
}

function updateCountdownDisplay(el, seconds) {

    if (!el) return;

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    el.textContent = `${minutes}m ${secs}s`;
}

/* ==============================
   SUCCESS / MISS
============================== */

function reachCurrent() {

    clearInterval(countdownInterval);

    const id = activeTargetId;

    reachedLocations.add(id);
    localStorage.setItem("reachedLocations", JSON.stringify([...reachedLocations]));

    db.ref("gameProgress/secret" + id).set({
        reached: true,
        reachedAt: Date.now()
    });

    completeLocation(id, true);
    updateProgress();

    setTimeout(() => unlockNext(id), 1000);
}

function missLocation(id) {

    clearInterval(countdownInterval);

    missedLocations.add(id);
    localStorage.setItem("missedLocations", JSON.stringify([...missedLocations]));

    db.ref("gameProgress/secret" + id).set({
        reached: false,
        missedAt: Date.now()
    });

    completeLocation(id, false);

    setTimeout(() => unlockNext(id), 1000);
}

/* ==============================
   COMPLETE UI
============================== */

function completeLocation(id, isSuccess) {

    const counter = document.getElementById(`counter${id}`);

    counter.classList.remove('active');

    if (isSuccess) {
        counter.classList.add('success');
        counter.querySelector('.distance').innerHTML = '✅ SUCCESS!';
    } else {
        counter.classList.add('missed');
        counter.querySelector('.distance').innerHTML = 'TIME UP!';
    }

    const countdownEl = document.getElementById(`countdown${id}`);
    if (countdownEl) countdownEl.remove();

    endTime = null;
    localStorage.removeItem("endTime");
}

/* ==============================
   PROGRESS SYSTEM
============================== */

function updateProgress() {

    const progressCount = reachedLocations.size;
    const progressPercent = progressCount / 6 * 100;

    document.getElementById('progressFill').style.width =
        progressPercent + '%';

    document.getElementById('progressText').textContent =
        `${progressCount}/6 Secrets Found`;
}

/* ==============================
   UNLOCK NEXT
============================== */

function unlockNext(currentId) {

    if (currentId >= 6) return;

    const nextId = currentId + 1;
    const nextCounter = document.getElementById(`counter${nextId}`);

    nextCounter.classList.remove('locked');
    loadSecretFromBackend(nextId);
}

/* ==============================
   INIT
============================== */

window.onload = function () {

    startGlobalTracking();

    const savedTarget = localStorage.getItem("activeTargetId");
    const savedEndTime = localStorage.getItem("endTime");
    const savedReached = localStorage.getItem("reachedLocations");
    const savedMissed = localStorage.getItem("missedLocations");

    if (savedReached)
        reachedLocations = new Set(JSON.parse(savedReached));

    if (savedMissed)
        missedLocations = new Set(JSON.parse(savedMissed));

    if (savedTarget && savedEndTime) {

        activeTargetId = parseInt(savedTarget);
        endTime = parseInt(savedEndTime);

        loadSecretFromBackend(activeTargetId);

    } else {

        activeTargetId = 1;
        loadSecretFromBackend(1);
    }

    updateProgress();
};