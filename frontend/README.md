# Frontend Documentation

This frontend is a React + Vite application for the MedBook medical booking platform. It provides the user-facing experience for searching labs, booking tests, managing appointments, and interacting with authentication flows.

## Tech Stack

- React 19
- Vite 8
- TanStack React Router
- Tailwind CSS
- ESLint

## Project Structure

- src/main.jsx — application entry point
- src/index.css — global styles and Tailwind entry
- src/routes/ — route definitions for the app pages
- src/components/ — reusable UI components such as navigation, footer, and cards
- src/context/ — shared React context providers, including authentication
- src/api/ — API helper layer for backend communication
- src/assets/ — static assets such as images and icons

## Available Scripts

Run these commands from the frontend folder:

- npm install — install dependencies
- npm run dev — start the development server
- npm run build — create a production build
- npm run preview — preview the production build locally
- npm run lint — run ESLint checks

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open the local Vite URL shown in the terminal.

## Environment Variables

Create a .env file in the frontend folder if you need custom configuration:

```env
VITE_API_URL=http://localhost:5000/api
```

## Main Features

- User registration and login
- Lab search and discovery
- Test selection and booking flow
- Appointment viewing and management
- Review and profile pages
- Protected routes backed by authentication context

## Routing Overview

The app uses TanStack React Router with route files under src/routes/.

Common routes include:

- / — home page
- /login — login page
- /register — registration page
- /search — lab search experience
- /labs — lab listing and related pages
- /appointments — user appointments
- /profile — user profile

## Authentication Flow

Authentication state is managed through the AuthContext provider in src/context/AuthContext.jsx.

The frontend stores:

- accessToken in localStorage
- user details in localStorage
- refresh token via HTTP-only cookie handled by the backend

## API Layer

The frontend uses the API helper in src/api/client.js to send requests to the backend.

Key behavior:

- attaches the access token to authenticated requests
- includes credentials for cookie-based refresh auth
- throws clear errors for failed API calls

## Styling

The app uses Tailwind CSS for layout and component styling. Global styles are defined in src/index.css.

## Notes for Contributors

- Keep route components focused on page structure and delegate business logic to context or API helpers where possible.
- Prefer reusable components for shared UI patterns.
- Validate changes with both build and lint checks before submitting.

## Verification Commands

Before finalizing frontend changes, run:

```bash
npm run build
npm run lint
```
