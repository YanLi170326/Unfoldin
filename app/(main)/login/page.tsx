import { LoginForm } from '@/components/auth/login-form';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="mb-8">
        <Link href="/" className="text-sm hover:underline">
          ← Back to Home
        </Link>
      </div>
      <LoginForm />
    </div>
  );
} 