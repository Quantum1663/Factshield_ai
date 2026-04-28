# FactShield User Manual

## 1. Introduction

This manual explains how to use FactShield from the perspective of an operator, reviewer, or presenter.

## 2. Starting the System

### Backend

Run the FastAPI backend from the `backend` directory.

### Frontend

Run the Next.js frontend from the `frontend-v3` directory.

The frontend is expected to communicate with the backend at:

`http://localhost:8000`

unless overridden through environment configuration.

## 3. Main Pages

### Home / Verification Console

This is the main working screen. It allows you to:

- paste a claim
- upload image or video content
- start analysis
- monitor pipeline state
- inspect active investigations

### Feed

Shows live intelligence items and incoming signals.

### Trending

Displays narrative patterns and tracked trends.

### Archive

Shows archived or previously analyzed evidence-related information.

### Reports

Allows the user to:

- open saved reports
- inspect report details
- edit metadata
- add reviewer notes
- set approval status
- export a downloadable report

### Team

Allows the user to:

- view analysts and reviewers
- inspect saved investigations
- assign investigations to team members

### Settings

Allows the user to:

- inspect control sets
- update values and statuses
- persist workspace configuration details

## 4. Verifying a Text Claim

1. Open the verification console.
2. Paste a clear claim in the text area.
3. Click the analyze action.
4. Wait for the task to begin processing.
5. Review:
   - verdict
   - evidence
   - reasoning
   - trace or explainability panels

Best results come from claims with:

- concrete subjects
- policies
- events
- places
- dates

Avoid extremely short or vague inputs.

## 5. Verifying an Image

1. Open the verification console.
2. Select image upload.
3. Upload a valid image file.
4. The system extracts context using:
   - provenance check
   - visual context extraction
   - verification pipeline analysis

Use images that contain meaningful context or textual content for stronger results.

## 6. Verifying a Video

1. Open the verification console.
2. Select video upload.
3. Upload a valid video file.
4. The backend will:
   - sample frames
   - run OCR
   - extract speech using transcription
   - merge text into a verification input

Video analysis depends on:

- OCR quality
- audio clarity
- available server dependencies

## 7. Understanding the Result

Each completed result may contain:

- claim
- verdict
- veracity prediction
- toxicity prediction
- evidence list
- debate trace
- generated reason
- historical context
- explainability signals

## 8. Using Reports

On the Reports page, users can:

1. open a report
2. edit title
3. edit owner
4. edit audience
5. add reviewer name
6. add reviewer notes
7. update approval status
8. export the report

The export action downloads a real report file backed by the backend.

## 9. Using Team Assignment

On the Team page:

1. review available investigations
2. choose an assignee
3. save the assignment

The selection is stored through the backend and can be read back later.

## 10. Using Settings

On the Settings page:

1. open a control card
2. adjust value, detail, or status
3. save changes

These changes persist through the backend workspace state.

## 11. Suggested Demo Flow

For presentation or demonstration:

1. start with a factual claim
2. follow with a misleading political claim
3. optionally show a toxic post for safety detection
4. open Reports to show backend-backed records
5. open Team to show assignment flow
6. open Settings to show workspace persistence

## 12. Common Errors

### "Claim text is too short to verify."

The submitted text is too small. Use a longer and more concrete claim.

### Upload type error

The file type does not match the required input type.

### Missing OCR or video support

Some media routes depend on installed server-side tools such as Tesseract, MoviePy, OpenCV, or Whisper-related dependencies.

## 13. Best Practices

- use specific claims
- use readable image inputs
- avoid vague statements during live demos
- verify backend is running before using the frontend
- use Reports after a successful verification to demonstrate the end-to-end workflow
