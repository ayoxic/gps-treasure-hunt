const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.database();

exports.validateLocation = functions.https.onCall(async (data, context) => {

    const { userLat, userLng, secretId } = data;

    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "User must be logged in"
        );
    }

    const secretSnapshot = await db.ref(`secrets/${secretId}`).once("value");
    const secret = secretSnapshot.val();

    if (!secret) {
        throw new functions.https.HttpsError("not-found", "Secret not found");
    }

    const distance = calculateDistance(
        userLat,
        userLng,
        secret.lat,
        secret.lng
    );

    if (distance <= secret.radius) {

        await db.ref(`progress/${context.auth.uid}/secret${secretId}`)
            .set({
                reached: true,
                reachedAt: Date.now()
            });

        return { status: "success" };

    } else {
        return { status: "too_far", distance };
    }
});

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