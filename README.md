# Unfoldin Demo - Emotion Release Tool

A voice-driven tool that guides users through emotional release using AI conversation.

## Features

- User registration and authentication
- Voice-guided emotion release sessions
- Timed silence periods for reflection
- Session history tracking
- Minimal, distraction-free UI

## Tech Stack

- **Framework**: Next.js
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **State Management**: Jotai
- **Database**: Vercel Postgres
- **Voice Synthesis**: OpenAI TTS API

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Create a `.env.local` file with the following:
   ```
   POSTGRES_URL="your-postgres-connection-string"
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Database Setup

The application uses Vercel Postgres. You can find the schema in `lib/schema.sql`.

To set up the database tables:
1. Connect to your Postgres instance
2. Run the SQL commands in `lib/schema.sql`

## Usage

1. Create an account or log in
2. Enter your OpenAI API key for voice synthesis
3. Start a new emotion release session
4. Listen to the AI-guided questions and take time to reflect during silence periods
5. Continue through all questions to complete the session

## Project Structure

- `/app` - Next.js app router pages
- `/components` - Reusable UI components
- `/lib` - Utility functions and state management
- `/public` - Static assets

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
