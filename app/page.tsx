import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="container py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold">Unfoldin Emotional Release</h1>
        <p className="text-xl mt-4 text-muted-foreground">
          An AI-powered emotional release assistant
        </p>
      </div>
      
      <div className="max-w-3xl mx-auto">
        <div className="border rounded-lg p-8 hover:shadow-md transition-shadow text-center">
          <h2 className="text-2xl font-semibold mb-4">Unfoldin Emotional Release Assistant</h2>
          <p className="mb-6">
            A guided conversation that helps you identify and release emotions 
            through a structured step-by-step process.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left">
            <div>
              <h3 className="text-lg font-medium mb-2">Features</h3>
              <ul className="list-disc list-inside text-muted-foreground">
                <li>Emotional awareness and identification</li>
                <li>Step-by-step release process</li>
                <li>Bilingual support (English/Chinese)</li>
                <li>Voice input and output support</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Benefits</h3>
              <ul className="list-disc list-inside text-muted-foreground">
                <li>Release difficult emotions</li>
                <li>Develop emotional awareness</li>
                <li>Private and secure conversations</li>
                <li>Save your conversation history</li>
              </ul>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Link 
              href="/unfoldin" 
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-md inline-block text-lg"
            >
              Start Using Unfoldin
            </Link>
          </div>
        </div>
      </div>
      
      <div className="mt-16 space-y-4 text-center text-muted-foreground">
        <p>Your conversations are private and can be saved to your account for future reference.</p>
      </div>
    </div>
  );
}
