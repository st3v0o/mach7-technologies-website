export default function Privacy() {
  return (
    <div className="container mx-auto px-4 py-24 max-w-3xl">
      <div className="mb-12">
        <h1 className="font-display text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground font-mono text-sm">Last Updated: [ Date ]</p>
      </div>

      <div className="prose prose-invert prose-orange max-w-none">
        <p>
          {/* SWAP: Update with actual company name and details */}
          This Privacy Policy describes how MACH 7 Technologies LLC ("we", "us", or "our") collects, uses, and shares information when you use our mobile application, website, and related services.
        </p>
        
        <h2>1. Information We Collect</h2>
        <p>
          [ Placeholder: Detail the types of data collected (e.g., location data, media, device information). ]
        </p>

        <h2>2. How We Use Your Information</h2>
        <p>
          [ Placeholder: Explain how the collected data is used to provide the service. ]
        </p>

        <h2>3. Data Storage and Security</h2>
        <p>
          [ Placeholder: Describe security measures and where data is stored. ]
        </p>

        <h2>4. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, please contact us at:<br/>
          {/* SWAP: replace with your business email */}
          <a href="mailto:contact@mach7technologies.com" className="text-primary hover:underline">contact@mach7technologies.com</a>
        </p>
      </div>
    </div>
  );
}
