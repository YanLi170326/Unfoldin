export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-3xl w-full text-center space-y-4">
        <h1 className="text-4xl font-bold">404 - Page Not Found</h1>
        <p className="text-xl">The page you're looking for doesn't exist.</p>
        <a href="/" className="text-blue-500 hover:underline">
          Return Home
        </a>
      </div>
    </div>
  );
} 