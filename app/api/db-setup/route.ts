import { NextResponse } from 'next/server';
import { checkDatabaseConnection, setupDatabaseSchema } from '@/lib/db-check';

export async function GET() {
  try {
    // Check database connection
    const connectionResult = await checkDatabaseConnection();
    
    if (!connectionResult.success) {
      return NextResponse.json(
        { 
          message: 'Database connection failed', 
          error: connectionResult.error 
        },
        { status: 500 }
      );
    }
    
    // Setup database schema
    const schemaResult = await setupDatabaseSchema();
    
    if (!schemaResult.success) {
      return NextResponse.json(
        { 
          message: 'Database schema setup failed', 
          error: schemaResult.error 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        message: 'Database setup successful',
        connection: connectionResult,
        schema: schemaResult
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in database setup endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { message: `Database setup error: ${errorMessage}` },
      { status: 500 }
    );
  }
} 