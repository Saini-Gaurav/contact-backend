const { google } = require("googleapis");
const readline = require("readline");
const { OAuth2 } = google.auth;
require("dotenv").config();
// Load the credentials from the JSON file
const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Generate an authentication URL
const SCOPES = ["https://www.googleapis.com/auth/calendar"];

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline", // Ensures the refresh token is returned
  scope: SCOPES,
});

console.log("Authorize this app by visiting this URL:", authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Get the authorization code from the user
rl.question("Enter the code from that page here: ", (code) => {
  rl.close();

  // Exchange the authorization code for an access token and refresh token
  oAuth2Client.getToken(code, (err, token) => {
    if (err) return console.error("Error retrieving access token", err);

    console.log("Token received: ", token);
    // Log the refresh token
    console.log("Your refresh token is:", token.refresh_token);

    oAuth2Client.setCredentials(token);
  });
});
