# Our Collaborative Web Project

This project is separated into frontend and backend directories to allow independent development.

## Project Structure
- `/frontend`: Contains the HTML, CSS, and vanilla JS for the user interface.
- `/backend`: Contains a simple Node.js Express server to serve as an API.

## Frontend Setup (You)
The frontend doesn't strictly need a build step since it uses vanilla web technologies.
You can open `frontend/index.html` directly in your browser, or use an extension like Live Server in VS Code to serve it locally.

## Backend Setup (Your Friends)
To run the backend, they will need [Node.js](https://nodejs.org/) installed.
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install the required dependencies (Express, CORS):
   ```bash
   npm install
   ```
3. Start the server (it will run on http://localhost:3000):
   ```bash
   npm run dev
   ```

## Workflow
1. Run the backend server.
2. Open the frontend in your browser.
3. The frontend is configured to make API requests to `http://localhost:3000`.
