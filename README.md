# HealthMate AI

HealthMate AI is an innovative prototype application designed to provide AI-powered health insights and assist users in finding nearby medical facilities. It leverages cutting-edge AI to analyze user-reported symptoms, suggest potential conditions, and offer guidance on next steps.

HealthMate AI was created for the Google APAC Solution Challenge 2025

## Core Features

*   **Symptom Input & Analysis**:
    *   Users can describe their symptoms textually.
    *   Optionally, users can upload an image of their symptom for visual context.
*   **AI-Powered Insights**:
    *   **Severity Assessment**: The AI provides a perspective on the potential seriousness of the symptoms and recommends general next steps.
    *   **Potential Conditions**: Suggests a list of potential medical conditions based on the input, along with explanations and key distinguishing symptoms for each.
    *   **Doctor Specialty Suggestion**: Recommends a type of medical specialist the user might consider consulting based on their symptoms.
*   **Visual Follow-Up**:
    *   After the initial analysis, users can select from the suggested conditions (presented with placeholder images) to receive more refined advice from the AI.
*   **Interactive Chat**:
    *   Users can engage in a follow-up conversation with the AI, asking clarifying questions or providing more details.
    *   The AI responds contextually, and its understanding of severity and potential conditions can be updated based on the chat.
*   **Find Nearby Medical Professionals**:
    *   Utilizes geolocation (with a fallback to a default location like Melbourne) to display nearby medical facilities.
    *   Features an interactive map (using Leaflet.js) showing mock doctor and hospital locations.
    *   Lists mock doctors with details such as specialty, estimated distance, website, and phone number.
    *   Highlights doctors whose specialty matches the AI's recommendation.
    *   Includes an option to refresh the map based on the user's current location.
*   **Chat History & Session Management**:
    *   Saves all interaction sessions (symptoms, AI responses, chat messages, map state) to the browser's `localStorage`.
    *   Allows users to view a list of past sessions, load them to review or continue, and delete old sessions.
    *   Ensures unique titles for chat sessions for easy identification.
*   **User Authentication (Prototype)**:
    *   Includes mock login and signup pages to simulate a user account system.
    *   For prototype purposes, authentication is handled locally without actual backend calls or API key requirements for auth itself.
*   **User Interface**:
    *   Modern, responsive UI built with Next.js, React, ShadCN UI components, and Tailwind CSS.
    *   Features a distinct dark green "bubbly" theme.

## Tech Stack

*   **Frontend**: Next.js (App Router), React, TypeScript
*   **UI Components**: ShadCN UI
*   **Styling**: Tailwind CSS
*   **AI Integration**: Genkit (for AI flows, powered by Google's Gemini models)
*   **Mapping**: Leaflet.js (for an API-key-free map solution)

## Getting Started

To access the preview of the preview, use this link:
https://6000-firebase-studio-1747075442827.cluster-xpmcxs2fjnhg6xvn446ubtgpio.cloudworkstations.dev/

## Important Notes

*   **Prototype Status**: This application is a prototype. The medical information provided is AI-generated and **not a substitute for professional medical advice**. Always consult with a qualified healthcare provider for any health concerns.
*   **Mock Data**: Information for doctors and hospitals is currently mocked and for demonstration purposes only.
*   **Mock Authentication**: The login/signup system is a prototype and does not use a real authentication backend.
*   **Placeholder Images**: Images used in the "Visual Follow-Up" section are placeholders.
*   **API Keys**: While authentication is mocked, the Genkit AI features require a valid API key for the underlying LLM provider (e.g., Google AI Studio for Gemini models).

This README provides an overview of HealthMate AI. Enjoy exploring its features!
