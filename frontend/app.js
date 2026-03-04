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
  apiKey: "AIzaSyCB8B1XPhpTvAsPppdSPSoZuZAV75MJE54",
  authDomain: "mi-projecto-a7aca.firebaseapp.com",
  databaseURL: "https://mi-projecto-a7aca-default-rtdb.firebaseio.com",
  projectId: "mi-projecto-a7aca",
  storageBucket: "mi-projecto-a7aca.firebasestorage.app",
  messagingSenderId: "426658213525",
  appId: "1:426658213525:web:949f63c399fb1f9179f59c",
  measurementId: "G-7N0B220B42"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.database();
const auth = firebase.auth();
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

    db.ref("secrets/" + secretId).once("value")
        .then(snapshot => {

            const data = snapshot.val();
            if (!data) {
                console.log("Secret not found");
                return;
            }

            currentSecret = {
                lat: data.lat,
                lng: data.lng,
                hint: data.hint
            };

            activateHint(secretId);
        })
        .catch(error => {
            console.error("Error loading secret:", error);
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

function showReward(id) {
    document.getElementById("reward" + id).classList.add("show");
}

function closeReward(id) {
    document.getElementById("reward" + id).classList.remove("show");
}

/* ==============================
   ACTIVATE SECRET
============================== */

function activateHint(locationId) {

    activeTargetId = locationId;

    const counter = document.getElementById(`counter${locationId}`);

    counter.classList.remove("locked");
    counter.classList.add("active");

    // ✅ SHOW THE REAL HINT
    if (currentSecret && currentSecret.hint) {
        counter.querySelector(".hint").textContent =
            `"${currentSecret.hint}"`;
    }

    counter.querySelector(".distance").textContent = "Tracking...";

    // Remove old countdowns
    document.querySelectorAll(".countdown").forEach(el => el.remove());

    const countdownEl = document.createElement("div");
    countdownEl.className = "countdown";
    countdownEl.id = `countdown${locationId}`;
    counter.appendChild(countdownEl);

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

const secretPhotos = {
    1: {
        img: "https://i.pinimg.com/1200x/98/d8/4c/98d84c9c624b3576d978c827d0780798.jpg",
        text: "location n1"
    },
    2: {
        img: "https://i.pinimg.com/736x/d7/31/c4/d731c46be38c45ba3d527d331fdbb80d.jpg",
        text: "location n2"
    },
    3: {
        img: "https://i.pinimg.com/736x/d9/1b/a8/d91ba8d5dc52383cdf8191dc06d1a3e6.jpg",
        text: "location n3"
    },
    4: {
        img: "https://i.pinimg.com/736x/60/43/b2/6043b22b9d09f44cf3d863dd3ad3cc1a.jpg",
        text: "location n4"
    },
    5: {
        img: "https://i.pinimg.com/736x/e9/a5/f1/e9a5f16a8b2049a88250eb82420cf70c.jpg",
        text: "location n5"
    },
    6: {
        img: "https://i.pinimg.com/736x/0b/12/91/0b12918dd3af83ab9f61775fdf521b6e.jpg",
        text: "final location"
    }
};

function showPhoto(id) {

    const modal = document.getElementById("photoModal");
    const img = document.getElementById("photoImage");
    const text = document.getElementById("photoText");

    img.src = secretPhotos[id].img;
    text.innerText = secretPhotos[id].text;

    modal.classList.add("show");

    // Close automatically after 4 seconds
    setTimeout(() => {
        modal.classList.remove("show");
    }, 4000);
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

    // Get current user UID
    const userId = firebase.auth().currentUser.uid;

    // Save progress to Firebase
    firebase.database().ref("progress/" + userId + "/secret" + id).set({
        reached: true,
        reachedAt: Date.now()
    })
    .then(() => {
        console.log("Progress saved successfully");
    })
    .catch((error) => {
        console.error("Error saving progress:", error);
    });

    completeLocation(id, true);
    updateProgress();

    setTimeout(() => unlockNext(id), 1000);
}

function missLocation(id) {

    clearInterval(countdownInterval);

    missedLocations.add(id);
    localStorage.setItem("missedLocations", JSON.stringify([...missedLocations]));

    const userId = firebase.auth().currentUser.uid;

    firebase.database().ref("progress/" + userId + "/secret" + id).set({
        reached: false,
        missedAt: Date.now()
    })
    .then(() => {
        console.log("Miss saved successfully");
    })
    .catch((error) => {
        console.error("Error saving miss:", error);
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
        counter.querySelector('.distance').innerHTML = "✅ SUCCESS";
    } else {
        counter.classList.add('missed');
        counter.querySelector('.distance').innerHTML = "❌ MISSED";
    }

    // 🔥 SHOW PHOTO POPUP
    showPhoto(id);

    const countdownEl = document.getElementById(`countdown${id}`);
    if (countdownEl) countdownEl.remove();

    endTime = null;
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

function initializeGame() {

    const savedTarget = localStorage.getItem("activeTargetId");
    const savedEndTime = localStorage.getItem("endTime");
    const savedReached = localStorage.getItem("reachedLocations");
    const savedMissed = localStorage.getItem("missedLocations");

    // Restore reached locations
    if (savedReached) {
        reachedLocations = new Set(JSON.parse(savedReached));
    }

    // Restore missed locations
    if (savedMissed) {
        missedLocations = new Set(JSON.parse(savedMissed));
    }

    // Restore visual state
    reachedLocations.forEach(id => {
        const counter = document.getElementById(`counter${id}`);
        if (!counter) return;

        counter.classList.remove("locked");
        counter.classList.add("success");
        counter.querySelector(".distance").innerHTML = "✅ SUCCESS";
        counter.querySelector(".hint").textContent =
        `"${secretPhotos[id]?.text || "Completed"}"`;
    });

    missedLocations.forEach(id => {
        const counter = document.getElementById(`counter${id}`);
        if (!counter) return;

        counter.classList.remove("locked");
        counter.classList.add("missed");
        counter.querySelector(".distance").innerHTML = "❌ MISSED";
        counter.querySelector(".hint").textContent =
        `"${secretPhotos[id]?.text || "Completed"}"`;
    });

    // Determine next active secret
    let nextId = 1;

    while (
        reachedLocations.has(nextId) ||
        missedLocations.has(nextId)
    ) {
        nextId++;
    }

    if (savedTarget && savedEndTime) {
        activeTargetId = parseInt(savedTarget);
        endTime = parseInt(savedEndTime);
        loadSecretFromBackend(activeTargetId);
    } else if (nextId <= 6) {
        activeTargetId = nextId;
        loadSecretFromBackend(nextId);
    }

    updateProgress();
}


/* ==============================
   INIT
============================== */
firebase.auth().signInAnonymously()
  .then(function() {
      console.log("Anonymous sign-in started");
  })
  .catch(function(error) {
      console.error("Auth error:", error);
  });

firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        console.log("User UID:", user.uid);
        startGlobalTracking();
        initializeGame();
    } else {
        console.log("No user yet...");
    }
});

