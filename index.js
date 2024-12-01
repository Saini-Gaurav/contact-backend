const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const { google } = require("googleapis");

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:3000", // Allow requests from localhost
      "https://landing-page-saas-pi.vercel.app", // Allow requests from Vercel
      "https://landing-page-saas-pi.vercel.app/#contact",
      "https://www.corazor.com/",
      "https://www.corazor.com/#contact" // Allow requests from the specific contact page
    ], // Allow requests from this origin
    methods: "GET,POST,PUT,DELETE", // Specify the allowed HTTP methods
    allowedHeaders: "Content-Type", // Allow certain headers
    credentials: true, // Allow cookies if needed
  })
);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  query: String,
});

const Contact = mongoose.model("Contact", contactSchema);

// Google Calendar OAuth2 setup
const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Set credentials using the refresh token
oAuth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});

// Function to create a Google Meet event
async function createGoogleMeetEvent(name, email, startDateTime, endDateTime) {
  const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

  const event = {
    summary: `Meeting with ${name}`,
    description: `Meeting to discuss query from ${name}`,
    start: {
      dateTime: startDateTime,
      timeZone: "Asia/Kolkata",
    },
    end: {
      dateTime: endDateTime,
      timeZone: "Asia/Kolkata",
    },
    attendees: [{ email: email }, { email: "Anant@corazor.com" }],
    conferenceData: {
      createRequest: {
        requestId: "random-string-to-ensure-uniqueness",
        conferenceSolutionKey: {
          type: "hangoutsMeet",
        },
      },
    },
  };

  try {
    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
      conferenceDataVersion: 1,
    });
    return response.data.hangoutLink;
  } catch (error) {
    console.error("Error creating Google Meet event:", error);
    throw error;
  }
}

// Contact form submission route
app.post("/api/contact", async (req, res) => {
  const { name, email, query, date, time } = req.body;

  try {
    // Save contact form details to MongoDB
    const newContact = new Contact({ name, email, query });
    await newContact.save();

    // Combine date and time to create a Date object for event start time
    // Combine date and time to create a Date object for event start time
    const startDateTime = new Date(`${date}T${time}:00.000Z`); // Ensure UTC time

    // Set the meeting to last 30 minutes (or adjust as needed)
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + 30); // Default 30-minute duration

    console.log("start", startDateTime);
    console.log("end", endDateTime);
    // Create Google Meet event with the provided date and time
    const meetLink = await createGoogleMeetEvent(
      name,
      email,
      startDateTime,
      endDateTime
    );

    // Respond with success and meeting link
    res.status(201).json({
      message: "Contact saved successfully and Google Meet scheduled",
      meetLink: meetLink,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to save contact or schedule meet", error });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
